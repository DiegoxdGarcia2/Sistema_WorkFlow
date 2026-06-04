import 'package:hive/hive.dart';

part 'tramite_model.g.dart';

@HiveType(typeId: 0)
class TramiteModel extends HiveObject {
  @HiveField(0)
  String? id;

  @HiveField(1)
  String politicaId;

  @HiveField(2)
  String tenantId;

  @HiveField(3)
  String? codigoSeguimiento;

  @HiveField(4)
  String clienteId;

  @HiveField(5)
  String documentoCliente;

  @HiveField(6)
  String clienteNombre;

  @HiveField(7)
  String estado;

  @HiveField(8)
  DateTime? finalizadoEn;

  @HiveField(9)
  DateTime? iniciadoEn;

  @HiveField(10)
  String syncStatus;

  @HiveField(11)
  String offlineId;

  @HiveField(12)
  String usuarioId;

  TramiteModel({
    this.id,
    required this.politicaId,
    required this.tenantId,
    this.codigoSeguimiento,
    required this.clienteId,
    required this.documentoCliente,
    required this.clienteNombre,
    this.estado = 'INICIADO',
    this.finalizadoEn,
    this.iniciadoEn,
    this.syncStatus = 'PENDING',
    required this.offlineId,
    required this.usuarioId,
  });
}
