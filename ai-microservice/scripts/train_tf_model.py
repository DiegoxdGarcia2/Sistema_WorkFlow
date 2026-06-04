"""
train_tf_model.py - Script para extraer datos de MongoDB, preprocesar con Pandas
y entrenar el modelo Multi-Output y el Autoencoder con TensorFlow/Keras.
"""

import os
import sys
import numpy as np
import pandas as pd
import pickle
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from dotenv import load_dotenv

import tensorflow as tf
from tensorflow.keras.models import Model, Sequential
from tensorflow.keras.layers import Input, Dense, BatchNormalization, Dropout

# Asegurar import de database
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, parent_dir)
load_dotenv(os.path.join(parent_dir, '.env'))

from database import get_db

def extraer_datos():
    print("[1/5] Extrayendo datos desde MongoDB...")
    db = get_db()
    if db is None:
        raise Exception("No se pudo conectar a MongoDB")

    # Extraer trámites y registros de actividad
    tramites_list = list(db["tramites"].find({"estado": "COMPLETADO"}))
    registros_list = list(db["registros_actividad"].find({}))
    
    if not tramites_list or not registros_list:
        raise Exception("No hay suficientes datos en la BD para entrenar.")
        
    df_tramites = pd.DataFrame(tramites_list)
    df_registros = pd.DataFrame(registros_list)
    
    return df_tramites, df_registros

def preparar_features(df_tramites, df_registros):
    print("[2/5] Preprocesando datos y generando features...")
    
    # Simulación de generación de dataset para el modelo
    # En un escenario real cruzaríamos registros con trámites. 
    # Aquí prepararemos un dataset representativo en base a los registros.
    
    dataset = []
    for _, reg in df_registros.iterrows():
        # Variables de tiempo (Target)
        inicio = reg.get("asignadoEn")
        fin = reg.get("completadoEn")
        
        if not inicio or not fin:
            continue
            
        duracion_minutos = (fin - inicio).total_seconds() / 60.0
        if duracion_minutos < 0:
            duracion_minutos = 0
            
        # Features
        hora_del_dia = inicio.hour
        dia_de_semana = inicio.weekday()
        departamento_id = str(reg.get("departamentoId", ""))
        politica_id = str(reg.get("politicaId", "default"))
        
        # Simular "Carga actual" aleatoriamente basada en la hora
        carga_actual = np.random.poisson(lam=10 if 8 <= hora_del_dia <= 18 else 2)
        
        # Simular historial de cliente (score 0-1)
        historial_cliente = np.random.uniform(0.5, 1.0)
        
        # Prioridad (Target de Clasificación): 0 = BAJA, 1 = MEDIA, 2 = ALTA
        # Derivado artificialmente de la duración para este ejemplo
        if duracion_minutos > 180:
            prioridad = 2
        elif duracion_minutos > 60:
            prioridad = 1
        else:
            prioridad = 0
            
        # Siguiente ruta recomendada (Target de Clasificación/Regresión)
        # Usaremos LabelEncoding para la siguiente actividad
        siguiente_actividad = str(reg.get("actividadId", "FIN"))
        
        dataset.append({
            "hora_del_dia": hora_del_dia,
            "dia_de_semana": dia_de_semana,
            "departamento_id": departamento_id,
            "politica_id": politica_id,
            "carga_actual": carga_actual,
            "historial_cliente": historial_cliente,
            "duracion_minutos": duracion_minutos,
            "prioridad": prioridad,
            "siguiente_actividad": siguiente_actividad
        })
        
    df = pd.DataFrame(dataset)
    return df

def entrenar_modelos(df):
    print("[3/5] Entrenando Modelos de TensorFlow...")
    
    # 1. Encoders y Scalers
    le_depto = LabelEncoder()
    df["departamento_idx"] = le_depto.fit_transform(df["departamento_id"])
    
    le_politica = LabelEncoder()
    df["politica_idx"] = le_politica.fit_transform(df["politica_id"])
    
    le_actividad = LabelEncoder()
    df["actividad_idx"] = le_actividad.fit_transform(df["siguiente_actividad"])
    
    # Features (X)
    X = df[["hora_del_dia", "dia_de_semana", "departamento_idx", "politica_idx", "carga_actual", "historial_cliente"]].values
    
    # Scaler
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Targets (Y)
    y_duracion = df["duracion_minutos"].values
    y_prioridad = pd.get_dummies(df["prioridad"]).values
    y_ruta = pd.get_dummies(df["actividad_idx"]).values
    
    X_train, X_test, y_dur_train, y_dur_test, y_pri_train, y_pri_test, y_ruta_train, y_ruta_test = train_test_split(
        X_scaled, y_duracion, y_prioridad, y_ruta, test_size=0.2, random_state=42
    )
    
    # --- MODELO 1: MULTI-OUTPUT (Duración, Prioridad, Ruta) ---
    input_layer = Input(shape=(X.shape[1],), name="input_features")
    
    # Shared layers
    x = Dense(64, activation='relu')(input_layer)
    x = BatchNormalization()(x)
    x = Dropout(0.2)(x)
    x = Dense(32, activation='relu')(x)
    shared = BatchNormalization()(x)
    
    # Output Branches
    out_duracion = Dense(1, activation='linear', name="duracion_output")(shared)
    out_prioridad = Dense(y_prioridad.shape[1], activation='softmax', name="prioridad_output")(shared)
    out_ruta = Dense(y_ruta.shape[1], activation='softmax', name="ruta_output")(shared)
    
    model_mo = Model(inputs=input_layer, outputs=[out_duracion, out_prioridad, out_ruta])
    
    model_mo.compile(
        optimizer='adam',
        loss={
            'duracion_output': 'mse',
            'prioridad_output': 'categorical_crossentropy',
            'ruta_output': 'categorical_crossentropy'
        },
        metrics={
            'duracion_output': 'mae',
            'prioridad_output': 'accuracy',
            'ruta_output': 'accuracy'
        }
    )
    
    print("Entrenando Modelo Multi-Output...")
    model_mo.fit(
        X_train, 
        {"duracion_output": y_dur_train, "prioridad_output": y_pri_train, "ruta_output": y_ruta_train},
        validation_data=(X_test, {"duracion_output": y_dur_test, "prioridad_output": y_pri_test, "ruta_output": y_ruta_test}),
        epochs=20,
        batch_size=32,
        verbose=0
    )
    
    # --- MODELO 2: AUTOENCODER (Detección de Anomalías) ---
    print("Entrenando Autoencoder para Anomalías...")
    autoencoder = Sequential([
        Input(shape=(X.shape[1],)),
        Dense(16, activation='relu'),
        Dense(8, activation='relu'),
        Dense(4, activation='relu'),
        Dense(8, activation='relu'),
        Dense(16, activation='relu'),
        Dense(X.shape[1], activation='linear')
    ])
    
    autoencoder.compile(optimizer='adam', loss='mse')
    autoencoder.fit(X_train, X_train, epochs=20, batch_size=32, validation_data=(X_test, X_test), verbose=0)
    
    return model_mo, autoencoder, scaler, le_depto, le_politica, le_actividad

def exportar_artefactos(model_mo, autoencoder, scaler, le_depto, le_politica, le_actividad):
    print("[4/5] Exportando Modelos y Scalers...")
    artifacts_dir = os.path.join(parent_dir, "models")
    os.makedirs(artifacts_dir, exist_ok=True)
    
    # Guardar Keras models
    model_mo.save(os.path.join(artifacts_dir, "routing_multi_output.keras"))
    autoencoder.save(os.path.join(artifacts_dir, "anomaly_autoencoder.keras"))
    
    # Guardar Scalers y Encoders
    with open(os.path.join(artifacts_dir, "preprocessing_pipeline.pkl"), "wb") as f:
        pickle.dump({
            "scaler": scaler,
            "le_depto": le_depto,
            "le_politica": le_politica,
            "le_actividad": le_actividad
        }, f)
        
    print("[5/5] Exportación completada exitosamente en /models.")

def main():
    print("=" * 60)
    print("  Entrenamiento del Motor Predictivo (TensorFlow/Keras)")
    print("=" * 60)
    
    df_tramites, df_registros = extraer_datos()
    df_features = preparar_features(df_tramites, df_registros)
    
    print(f"Dataset consolidado: {df_features.shape[0]} registros para entrenamiento.")
    
    if df_features.shape[0] < 50:
        print("Advertencia: Muy pocos datos. El modelo podría hacer overfitting.")
        
    model_mo, autoencoder, scaler, le_depto, le_politica, le_actividad = entrenar_modelos(df_features)
    
    exportar_artefactos(model_mo, autoencoder, scaler, le_depto, le_politica, le_actividad)
    
    print("=" * 60)
    print("  ENTRENAMIENTO FINALIZADO")
    print("=" * 60)

if __name__ == "__main__":
    main()
