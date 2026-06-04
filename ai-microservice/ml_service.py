"""
ml_service.py — Motor de Análisis de Machine Learning y Generación de Insights

ARQUITECTURA (Fase 3):
1. Pandas: Detección de cuellos de botella calculando medias y desviaciones estándar
   directamente de los datos históricos en MongoDB.
2. Scikit-learn: Entrenamiento de un RandomForestRegressor para estimar la duración
   de nuevos trámites basado en el historial.
3. Groq (LLM): Traducción de las métricas numéricas a insights y recomendaciones
   naturales y procesables para negocio.
"""

import logging
import json
from datetime import datetime
from typing import Optional, Any, Dict, List
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import r2_score

from database import get_collection
# Importamos el cliente de Groq y el modelo desde main.py para reutilizarlo
# Para evitar dependencias circulares, pasaremos el cliente groq como argumento.

log = logging.getLogger(__name__)

# System prompt para generar los insights de ML
INSIGHTS_SYSTEM_PROMPT = """Eres un Analista de Negocio Senior y Data Scientist experto en BPM (Business Process Management).
Recibirás un JSON con datos analíticos de ejecución de procesos, incluyendo métricas globales, cuellos de botella detectados estadísticamente y predicciones de un modelo de Machine Learning.

Tu objetivo es interpretar estos datos numéricos y redactar un reporte ejecutivo:
1. Identifica los principales problemas usando los NOMBRES CONCRETOS de las actividades.
2. Cuantifica el impacto de forma clara (ej: "La tarea X es 2.5 veces más lenta que el promedio").
3. Proporciona recomendaciones accionables y específicas para optimizar el flujo.
4. Explica brevemente la predicción del modelo (ej: "Basado en el historial, los próximos trámites tomarán X días...").
5. Redacta el resultado en 3 a 5 párrafos, en español, con tono profesional y directo.

IMPORTANTE:
- NO repitas simplemente los números, dales contexto de negocio.
- Usa formato Markdown ligero (negritas para métricas clave o nombres de tareas).
- Si la 'confianza' de la predicción es 0.0, aclara que faltan datos históricos para hacer una estimación precisa y sugiere ejecutar más trámites.
"""

def cargar_datos(politica_id: Optional[str] = None, tenant_id: Optional[str] = None) -> pd.DataFrame:
    """
    Carga los registros de actividades desde MongoDB y los convierte en un DataFrame de Pandas.
    Filtra por registros completados y calcula la duración en minutos.
    """
    coll = get_collection("registros_actividad")
    if coll is None:
        return pd.DataFrame()
        
    query = {"estado": "HECHO", "asignadoEn": {"$ne": None}, "completadoEn": {"$ne": None}}
    if politica_id:
        query["politicaId"] = politica_id
    if tenant_id:
        query["tenantId"] = tenant_id
        
    # Usar projection para traer solo lo necesario
    cursor = coll.find(
        query, 
        {"actividadId": 1, "actividadNombre": 1, "departamentoId": 1, "asignadoEn": 1, "completadoEn": 1, "tramiteId": 1}
    )
    
    data = list(cursor)
    if not data:
        return pd.DataFrame()
        
    df = pd.DataFrame(data)
    
    # Asegurar que las columnas esperadas existan para evitar KeyErrors en pandas
    if 'actividadNombre' not in df.columns:
        df['actividadNombre'] = df['actividadId'] if 'actividadId' in df.columns else None
    if 'departamentoId' not in df.columns:
        df['departamentoId'] = 'UNKNOWN'
    if 'tramiteId' not in df.columns:
        df['tramiteId'] = None
        
    # Asegurar tipos datetime
    df['asignadoEn'] = pd.to_datetime(df['asignadoEn'])
    df['completadoEn'] = pd.to_datetime(df['completadoEn'])
    
    # Calcular duración en minutos
    df['duracion_minutos'] = (df['completadoEn'] - df['asignadoEn']).dt.total_seconds() / 60.0
    
    # Limpiar duraciones negativas (por posibles errores de reloj)
    df.loc[df['duracion_minutos'] < 0, 'duracion_minutos'] = 0.0
    
    return df

def detectar_cuellos_botella(df: pd.DataFrame) -> tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Analiza el DataFrame para encontrar cuellos de botella.
    Retorna (Métricas globales, Lista de cuellos de botella).
    """
    if df.empty:
        return {"totalRegistros": 0, "duracionPromedioMinutos": 0.0, "desviacionEstandar": 0.0, "tasaCompletitud": 0.0}, []
        
    total_registros = len(df)
    promedio_global = df['duracion_minutos'].mean()
    if pd.isna(promedio_global):
        promedio_global = 0.0
    else:
        promedio_global = float(promedio_global)

    std_global = df['duracion_minutos'].std() if total_registros > 1 else 0.0
    if pd.isna(std_global):
        std_global = 0.0
    else:
        std_global = float(std_global)
    
    metricas = {
        "totalRegistros": total_registros,
        "duracionPromedioMinutos": round(promedio_global, 2),
        "desviacionEstandar": round(std_global, 2),
        "tasaCompletitud": 1.0 # Simplificado por ahora
    }
    
    # Agrupar por actividad
    stats_actividad = df.groupby('actividadId').agg(
        nombre=('actividadNombre', 'first'),
        promedio=('duracion_minutos', 'mean'),
        count=('duracion_minutos', 'count')
    ).reset_index()
    
    # Nombre por defecto si no viene en DB
    stats_actividad['nombre'] = stats_actividad['nombre'].fillna(stats_actividad['actividadId'])
    
    cuellos_botella = []
    
    for _, row in stats_actividad.iterrows():
        # Regla: Toma más que el promedio global + 0.5 desviaciones (umbral más sensible) o es más del 150% del promedio
        # Y tiene al menos 2 ocurrencias para evitar falsos positivos por un caso aislado
        if (row['promedio'] > promedio_global * 1.5 or (std_global > 0 and row['promedio'] > promedio_global + 0.5 * std_global)) and row['count'] >= 2:
            
            desviacion_sobre = row['promedio'] / promedio_global if promedio_global > 0 else 1.0
            
            severity = "WARNING"
            if desviacion_sobre > 2.0:
                severity = "CRITICAL"
                
            promedio_minutos = float(row['promedio'])
            desviacion_sobre_val = float(desviacion_sobre)
            if pd.isna(promedio_minutos): promedio_minutos = 0.0
            if pd.isna(desviacion_sobre_val): desviacion_sobre_val = 1.0

            cuellos_botella.append({
                "actividadId": str(row['actividadId']),
                "actividadNombre": str(row['nombre']),
                "promedioMinutos": round(promedio_minutos, 2),
                "desviacionSobre": round(desviacion_sobre_val, 1),
                "severity": severity,
                "numEjecuciones": int(row['count'])
            })
            
    # Ordenar por severidad y luego por desviación (de peor a mejor)
    cuellos_botella.sort(key=lambda x: (x['severity'] == 'CRITICAL', x['desviacionSobre']), reverse=True)
    
    return metricas, cuellos_botella

def entrenar_predictor(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Entrena un RandomForest simple para predecir la duración del trámite.
    Retorna métricas del modelo y la predicción estimada.
    """
    placeholder = {
        "duracionEstimadaDias": 0.0,
        "confianza": 0.0,
        "factoresRelevantes": []
    }
    
    if df.empty or 'tramiteId' not in df.columns:
        return placeholder
        
    # Necesitamos agrupar a nivel de trámite para predecir cuánto tarda un trámite completo
    # Eliminamos registros sin tramiteId
    df_tramites = df.dropna(subset=['tramiteId']).copy()
    
    if df_tramites.empty:
        return placeholder
        
    # Extraer features por trámite
    # 1. Total de duración (Target)
    # 2. Conteo de tareas (Feature)
    # 3. Departamento más frecuente (Feature categórica)
    # 4. Hora del día de inicio del trámite (Feature)
    
    tramites_stats = df_tramites.groupby('tramiteId').agg(
        duracion_total_min=('duracion_minutos', 'sum'),
        num_tareas=('actividadId', 'count'),
        inicio_tramite=('asignadoEn', 'min')
    ).reset_index()
    
    # Obtener el departamento dominante para cada trámite
    departamentos = df_tramites.groupby('tramiteId')['departamentoId'].agg(lambda x: x.mode()[0] if not x.mode().empty else "UNKNOWN").reset_index()
    tramites_stats = pd.merge(tramites_stats, departamentos, on='tramiteId')
    
    # Extraer feature temporal
    tramites_stats['hora_inicio'] = tramites_stats['inicio_tramite'].dt.hour
    
    # Necesitamos suficientes datos para entrenar (ej. 5 trámites)
    if len(tramites_stats) < 5:
        # Fallback analítico si no hay datos para ML
        mean_dur = tramites_stats['duracion_total_min'].mean()
        dias_promedio = float(mean_dur / (60.0 * 24.0)) if (len(tramites_stats) > 0 and not pd.isna(mean_dur)) else 0.0
        return {
            "duracionEstimadaDias": round(dias_promedio, 2),
            "confianza": 0.0,
            "factoresRelevantes": ["Datos insuficientes para ML. Se usa promedio simple."]
        }
        
    # Preparar datos para ML
    try:
        # Codificar variables categóricas
        le = LabelEncoder()
        # Manejar posibles valores nulos
        tramites_stats['departamentoId'] = tramites_stats['departamentoId'].fillna('UNKNOWN')
        # Convertir a string para LabelEncoder
        tramites_stats['departamentoId'] = tramites_stats['departamentoId'].astype(str)
        tramites_stats['dep_encoded'] = le.fit_transform(tramites_stats['departamentoId'])
        
        X = tramites_stats[['num_tareas', 'dep_encoded', 'hora_inicio']]
        y = tramites_stats['duracion_total_min']
        
        # Entrenar modelo
        model = RandomForestRegressor(n_estimators=50, random_state=42, max_depth=5)
        model.fit(X, y)
        
        # Evaluar (en el mismo set por simplicidad de este MVP, o R^2)
        y_pred = model.predict(X)
        r2 = r2_score(y, y_pred)
        
        # Evitar confianzas negativas (R2 puede ser negativo si el modelo es peor que predecir la media)
        confianza = float(max(0.0, r2))
        if pd.isna(confianza): confianza = 0.0
        
        # Extraer importancia de features
        importancias = model.feature_importances_
        nombres_features = ['Cantidad de Tareas', 'Departamento Asignado', 'Hora de Inicio']
        
        factores = []
        for i, imp in enumerate(importancias):
            if imp > 0.1: # Solo factores relevantes (>10% importancia)
                factores.append(f"{nombres_features[i]} ({round(float(imp) * 100)}%)")
                
        # Estimar duración para un "trámite promedio"
        X_mean = pd.DataFrame([X.mean().to_dict()])
        duracion_estimada_min = float(model.predict(X_mean)[0])
        if pd.isna(duracion_estimada_min): duracion_estimada_min = 0.0
        duracion_estimada_dias = duracion_estimada_min / (60.0 * 24.0)
        
        return {
            "duracionEstimadaDias": round(duracion_estimada_dias, 2),
            "confianza": round(confianza, 2),
            "factoresRelevantes": factores if factores else ["Ningún factor fuertemente determinante"]
        }
        
    except Exception as e:
        log.error("Error entrenando modelo de ML: %s", str(e))
        return placeholder

async def generar_insights_groq(groq_client, data_json: str) -> str:
    """Pide a Groq que genere insights en lenguaje natural basados en los datos numéricos."""
    if not groq_client:
        return "El motor de inferencia Groq no está configurado. Revisa la variable GROQ_API_KEY."
        
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": INSIGHTS_SYSTEM_PROMPT},
                {"role": "user", "content": f"Analiza los siguientes datos de ejecución de procesos y genera insights:\n\n{data_json}"}
            ],
            temperature=0.3,
            max_tokens=1500,
        )
        return response.choices[0].message.content
    except Exception as e:
        log.error("Error generando insights con Groq: %s", str(e))
        return f"No se pudieron generar los insights automáticos debido a un error: {str(e)}"

async def ejecutar_pipeline_completo(groq_client, politica_id: Optional[str] = None, tenant_id: Optional[str] = None) -> Dict[str, Any]:
    """Orquesta todo el pipeline: Pandas -> Scikit-learn -> Groq."""
    
    # 1. Extraer datos directamente de MongoDB
    df = cargar_datos(politica_id, tenant_id)
    
    # Inicializar respuesta por defecto
    respuesta = {
        "politicaId": politica_id,
        "generadoEn": datetime.utcnow().isoformat() + "Z",
        "metricas": {"totalRegistros": 0, "duracionPromedioMinutos": 0.0, "desviacionEstandar": 0.0, "tasaCompletitud": 0.0},
        "cuellosBottella": [],
        "prediccion": {"duracionEstimadaDias": 0.0, "confianza": 0.0, "factoresRelevantes": []},
        "insightsNaturales": "",
        "alertas": []
    }
    
    if df.empty:
        respuesta["insightsNaturales"] = "No hay suficientes datos de ejecución para realizar un análisis. " \
                                       "Complete instancias de este proceso para habilitar el motor de Machine Learning."
        respuesta["alertas"].append({"nivel": "INFO", "mensaje": "Datos insuficientes en MongoDB para este análisis."})
        return respuesta
        
    # 2. Análisis Estadístico (Pandas)
    metricas, cuellos = detectar_cuellos_botella(df)
    respuesta["metricas"] = metricas
    respuesta["cuellosBottella"] = cuellos
    
    # Generar alertas
    for c in cuellos:
        respuesta["alertas"].append({
            "nivel": c["severity"],
            "mensaje": f"Cuello de botella en '{c['actividadNombre']}': toma {c['promedioMinutos']} min (desviación {c['desviacionSobre']}x)"
        })
        
    # 3. Machine Learning (Scikit-learn)
    respuesta["prediccion"] = entrenar_predictor(df)
    
    # 4. Generación de Insights (Groq LLM)
    # Preparamos un JSON resumido para Groq (sin campos técnicos irrelevantes)
    datos_para_llm = json.dumps({
        "metricas_globales": metricas,
        "cuellos_botella_detectados": cuellos,
        "prediccion_ml": respuesta["prediccion"]
    }, ensure_ascii=False)
    
    insights = await generar_insights_groq(groq_client, datos_para_llm)
    respuesta["insightsNaturales"] = insights
    
    return respuesta
