// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tramite_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class TramiteModelAdapter extends TypeAdapter<TramiteModel> {
  @override
  final int typeId = 0;

  @override
  TramiteModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return TramiteModel(
      id: fields[0] as String?,
      politicaId: fields[1] as String,
      tenantId: fields[2] as String,
      codigoSeguimiento: fields[3] as String?,
      clienteId: fields[4] as String,
      documentoCliente: fields[5] as String,
      clienteNombre: fields[6] as String,
      estado: fields[7] as String,
      finalizadoEn: fields[8] as DateTime?,
      iniciadoEn: fields[9] as DateTime?,
      syncStatus: fields[10] as String,
      offlineId: fields[11] as String,
      usuarioId: fields[12] as String,
    );
  }

  @override
  void write(BinaryWriter writer, TramiteModel obj) {
    writer
      ..writeByte(13)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.politicaId)
      ..writeByte(2)
      ..write(obj.tenantId)
      ..writeByte(3)
      ..write(obj.codigoSeguimiento)
      ..writeByte(4)
      ..write(obj.clienteId)
      ..writeByte(5)
      ..write(obj.documentoCliente)
      ..writeByte(6)
      ..write(obj.clienteNombre)
      ..writeByte(7)
      ..write(obj.estado)
      ..writeByte(8)
      ..write(obj.finalizadoEn)
      ..writeByte(9)
      ..write(obj.iniciadoEn)
      ..writeByte(10)
      ..write(obj.syncStatus)
      ..writeByte(11)
      ..write(obj.offlineId)
      ..writeByte(12)
      ..write(obj.usuarioId);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TramiteModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
