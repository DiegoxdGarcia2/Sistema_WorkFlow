class SyncRequestDTO {
  final String politicaId;
  final String usuarioId;
  final String? clienteId;
  final String? documentoCliente;
  final String? clienteNombre;
  final String? offlineId;

  SyncRequestDTO({
    required this.politicaId,
    required this.usuarioId,
    this.clienteId,
    this.documentoCliente,
    this.clienteNombre,
    this.offlineId,
  });

  Map<String, dynamic> toJson() {
    return {
      'politicaId': politicaId,
      'usuarioId': usuarioId,
      'clienteId': clienteId,
      'documentoCliente': documentoCliente,
      'clienteNombre': clienteNombre,
      'offlineId': offlineId,
    };
  }
}
