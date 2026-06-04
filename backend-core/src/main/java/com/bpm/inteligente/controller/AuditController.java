package com.bpm.inteligente.controller;

import com.bpm.inteligente.domain.AuditLog;
import com.bpm.inteligente.service.AuditService;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Element;
import com.lowagie.text.FontFactory;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.web.bind.annotation.*;

import java.awt.Color;
import java.io.IOException;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;

    @GetMapping("/tenant/{tenantId}")
    public List<AuditLog> listarPorTenant(
            @PathVariable String tenantId,
            @RequestParam(required = false) String usuarioNombre,
            @RequestParam(required = false) String accion,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin,
            @RequestParam(required = false) String cargo,
            @RequestParam(required = false) String departamentoId,
            @RequestParam(required = false) String rol) {
        return auditService.listarPorTenant(tenantId, usuarioNombre, accion, fechaInicio, fechaFin, cargo, departamentoId, rol);
    }

    @GetMapping("/tenant/{tenantId}/export/excel")
    public void exportToExcel(
            @PathVariable String tenantId,
            @RequestParam(required = false) String usuarioNombre,
            @RequestParam(required = false) String accion,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin,
            @RequestParam(required = false) String cargo,
            @RequestParam(required = false) String departamentoId,
            @RequestParam(required = false) String rol,
            HttpServletResponse response) throws IOException {

        List<AuditLog> logs = auditService.listarPorTenant(tenantId, usuarioNombre, accion, fechaInicio, fechaFin, cargo, departamentoId, rol);

        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=\"reporte_auditoria.xlsx\"");

        try (Workbook workbook = new XSSFWorkbook(); ServletOutputStream out = response.getOutputStream()) {
            Sheet sheet = workbook.createSheet("Auditoría");

            // Header font and style
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);

            // Headers
            String[] headers = {"Fecha y Hora", "Usuario", "Acción", "Entidad", "ID Entidad", "Detalle"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            int rowIdx = 1;
            for (AuditLog log : logs) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(log.getTimestamp().toString());
                row.createCell(1).setCellValue(log.getUsuarioNombre() != null ? log.getUsuarioNombre() : "N/A");
                row.createCell(2).setCellValue(log.getAccion() != null ? log.getAccion() : "N/A");
                row.createCell(3).setCellValue(log.getEntidad() != null ? log.getEntidad() : "N/A");
                row.createCell(4).setCellValue(log.getEntidadId() != null ? log.getEntidadId() : "N/A");
                row.createCell(5).setCellValue(log.getDetalle() != null ? log.getDetalle() : "");
            }

            // Auto size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
        }
    }

    @GetMapping("/tenant/{tenantId}/export/pdf")
    public void exportToPdf(
            @PathVariable String tenantId,
            @RequestParam(required = false) String usuarioNombre,
            @RequestParam(required = false) String accion,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin,
            @RequestParam(required = false) String cargo,
            @RequestParam(required = false) String departamentoId,
            @RequestParam(required = false) String rol,
            HttpServletResponse response) throws IOException, DocumentException {

        List<AuditLog> logs = auditService.listarPorTenant(tenantId, usuarioNombre, accion, fechaInicio, fechaFin, cargo, departamentoId, rol);

        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition", "attachment; filename=\"reporte_auditoria.pdf\"");

        Document document = new Document(PageSize.A4, 36, 36, 54, 36);
        PdfWriter.getInstance(document, response.getOutputStream());

        document.open();

        // Add Title
        com.lowagie.text.Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.BLACK);
        Paragraph title = new Paragraph("Reporte de Auditoría de Sistema", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(20);
        document.add(title);

        // Add Metadata (Filters applied)
        com.lowagie.text.Font metaFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.DARK_GRAY);
        Paragraph meta = new Paragraph("Reporte generado el: " + Instant.now().toString(), metaFont);
        meta.setSpacingAfter(5);
        document.add(meta);

        if (usuarioNombre != null && !usuarioNombre.isEmpty()) {
            document.add(new Paragraph("Filtro Usuario: " + usuarioNombre, metaFont));
        }
        if (accion != null && !accion.isEmpty()) {
            document.add(new Paragraph("Filtro Acción: " + accion, metaFont));
        }
        if (fechaInicio != null && !fechaInicio.isEmpty()) {
            document.add(new Paragraph("Rango de Fechas: " + fechaInicio + " - " + (fechaFin != null ? fechaFin : "Actual"), metaFont));
        }
        if (cargo != null && !cargo.isEmpty()) {
            document.add(new Paragraph("Filtro Cargo: " + cargo, metaFont));
        }
        if (departamentoId != null && !departamentoId.isEmpty()) {
            document.add(new Paragraph("Filtro Departamento ID: " + departamentoId, metaFont));
        }
        if (rol != null && !rol.isEmpty()) {
            document.add(new Paragraph("Filtro Rol: " + rol, metaFont));
        }

        Paragraph spacing = new Paragraph(" ");
        spacing.setSpacingAfter(15);
        document.add(spacing);

        // Create Table
        PdfPTable table = new PdfPTable(4); // 4 columns
        table.setWidthPercentage(100);
        table.setWidths(new float[]{3.5f, 3.5f, 3.5f, 9.5f}); // column width ratios

        com.lowagie.text.Font headerCellFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
        com.lowagie.text.Font bodyCellFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.BLACK);

        // Headers
        String[] headers = {"Fecha y Hora", "Usuario", "Acción", "Detalle"};
        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, headerCellFont));
            cell.setBackgroundColor(new Color(30, 41, 59)); // Slate-800
            cell.setPadding(6);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(cell);
        }

        // Rows
        for (AuditLog log : logs) {
            // Col 1: Timestamp
            PdfPCell c1 = new PdfPCell(new Phrase(log.getTimestamp().toString(), bodyCellFont));
            c1.setPadding(5);
            table.addCell(c1);

            // Col 2: Usuario
            PdfPCell c2 = new PdfPCell(new Phrase(log.getUsuarioNombre() != null ? log.getUsuarioNombre() : "N/A", bodyCellFont));
            c2.setPadding(5);
            table.addCell(c2);

            // Col 3: Acción
            PdfPCell c3 = new PdfPCell(new Phrase(log.getAccion() != null ? log.getAccion() : "N/A", bodyCellFont));
            c3.setPadding(5);
            table.addCell(c3);

            // Col 4: Detalle
            PdfPCell c4 = new PdfPCell(new Phrase(log.getDetalle() != null ? log.getDetalle() : "", bodyCellFont));
            c4.setPadding(5);
            table.addCell(c4);
        }

        document.add(table);
        document.close();
    }
}
