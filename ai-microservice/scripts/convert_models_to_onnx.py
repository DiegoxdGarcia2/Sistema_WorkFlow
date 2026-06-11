import os
import tensorflow as tf
import tf2onnx
import onnx

def convert_models():
    scripts_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(scripts_dir)
    models_dir = os.path.join(parent_dir, "models")
    
    routing_keras_path = os.path.join(models_dir, "routing_multi_output.keras")
    anomaly_keras_path = os.path.join(models_dir, "anomaly_autoencoder.keras")
    
    routing_onnx_path = os.path.join(models_dir, "routing_multi_output.onnx")
    anomaly_onnx_path = os.path.join(models_dir, "anomaly_autoencoder.onnx")
    
    print(f"Loading Keras models from {models_dir}...")
    if not os.path.exists(routing_keras_path) or not os.path.exists(anomaly_keras_path):
        print("Keras models not found. Please train them first.")
        return
        
    routing_model = tf.keras.models.load_model(routing_keras_path)
    anomaly_model = tf.keras.models.load_model(anomaly_keras_path)
    
    print("Converting routing model to ONNX...")
    spec = (tf.TensorSpec((None, 6), tf.float32, name="input_features"),)
    routing_onnx, _ = tf2onnx.convert.from_keras(routing_model, input_signature=spec, opset=13)
    onnx.save(routing_onnx, routing_onnx_path)
    print(f"Saved routing ONNX model to {routing_onnx_path}")
    
    print("Converting anomaly autoencoder to ONNX...")
    anomaly_onnx, _ = tf2onnx.convert.from_keras(anomaly_model, opset=13)
    onnx.save(anomaly_onnx, anomaly_onnx_path)
    print(f"Saved anomaly ONNX model to {anomaly_onnx_path}")
    
    print("Conversion completed successfully!")

if __name__ == "__main__":
    convert_models()
