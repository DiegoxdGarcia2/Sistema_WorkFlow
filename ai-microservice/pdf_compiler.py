import os
import sys
import logging

# Configure GTK DLL directory for WeasyPrint on Windows
if sys.platform == 'win32':
    gtk_paths = [
        r'd:\Software 1er Parcial\gtk3\bin',
        r'C:\Program Files\GTK3-Runtime Win64\bin'
    ]
    for path in gtk_paths:
        if os.path.exists(path):
            os.environ['WEASYPRINT_DLL_DIRECTORIES'] = path
            os.environ['PATH'] = path + os.pathsep + os.environ.get('PATH', '')
            break

from weasyprint import HTML, CSS

logger = logging.getLogger(__name__)

# CSS Paged Media premium para WeasyPrint (Estilo Corporativo Enterprise)
CSS_ESTILOS = """
@page {
    size: letter;
    margin: 25mm 20mm 20mm 20mm;
    @top-center {
        content: "BPM INTELIGENTE ENTERPRISE — DOCUMENTO DE TRÁMITE";
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-size: 7pt;
        font-weight: bold;
        color: #94a3b8;
        border-bottom: 0.5px solid #e2e8f0;
        width: 100%;
        padding-bottom: 5px;
    }
    @bottom-right {
        content: "Página " counter(page) " de " counter(pages);
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-size: 8pt;
        font-weight: 500;
        color: #64748b;
    }
    @bottom-left {
        content: "CONFIDENCIAL — CONTROL DE AUDITORÍA";
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-size: 7pt;
        font-weight: bold;
        color: #94a3b8;
    }
}

body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.6;
    font-size: 10.5pt;
}

h1 {
    font-size: 20pt;
    color: #0f172a;
    font-weight: 800;
    margin-top: 0;
    margin-bottom: 15px;
    border-bottom: 2px solid #3b82f6;
    padding-bottom: 8px;
    page-break-after: avoid;
}

h2 {
    font-size: 14pt;
    color: #1e293b;
    font-weight: 700;
    margin-top: 25px;
    margin-bottom: 12px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 5px;
    page-break-after: avoid;
}

h3 {
    font-size: 11pt;
    color: #334155;
    font-weight: 700;
    margin-top: 20px;
    margin-bottom: 10px;
    page-break-after: avoid;
}

p {
    margin-top: 0;
    margin-bottom: 12px;
    text-align: justify;
}

ul, ol {
    margin-top: 0;
    margin-bottom: 15px;
    padding-left: 20px;
}

li {
    margin-bottom: 6px;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
    margin-bottom: 20px;
    page-break-inside: avoid;
}

th {
    background-color: #f1f5f9;
    color: #0f172a;
    font-weight: 700;
    text-align: left;
    padding: 8px 10px;
    border: 1px solid #cbd5e1;
    font-size: 9.5pt;
}

td {
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    font-size: 9.5pt;
}

blockquote {
    margin: 15px 0;
    padding: 10px 15px;
    background-color: #f8fafc;
    border-left: 4px solid #6366f1;
    color: #475569;
    font-style: italic;
}

pre, code {
    font-family: Consolas, Monaco, 'Andale Mono', monospace;
    font-size: 9pt;
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 2px 4px;
}

pre {
    padding: 10px;
    overflow: auto;
    white-space: pre-wrap;
    margin: 15px 0;
}

.signature-area {
    margin-top: 50px;
    page-break-inside: avoid;
}

.signature-row {
    display: flex;
    justify-content: space-between;
    margin-top: 40px;
}

.signature-box {
    width: 45%;
    text-align: center;
    border-top: 1px solid #cbd5e1;
    padding-top: 8px;
    font-size: 9pt;
    color: #64748b;
}
"""

def compilar_html_a_pdf(contenido_html: str) -> bytes:
    try:
        logger.info("Iniciando compilación WeasyPrint...")
        
        # Envolver en estructura HTML básica si no la tiene
        if "<html" not in contenido_html.lower():
            contenido_html = f"<html><body>{contenido_html}</body></html>"
            
        # Añadir bloque de firma corporativa al final del documento si no está presente
        if "signature-area" not in contenido_html:
            firma_html = """
            <div class="signature-area">
                <div class="signature-row">
                    <div class="signature-box">
                        <strong>Firma del Solicitante / Cliente</strong><br/>
                        Documento Registrado Digitalmente
                    </div>
                    <div class="signature-box">
                        <strong>Firma del Supervisor / Gerencia</strong><br/>
                        BPM Inteligente Enterprise Certificado
                    </div>
                </div>
            </div>
            """
            if "</body>" in contenido_html:
                contenido_html = contenido_html.replace("</body>", f"{firma_html}</body>")
            else:
                contenido_html += firma_html
                
        # Compilar usando WeasyPrint
        html = HTML(string=contenido_html)
        css = CSS(string=CSS_ESTILOS)
        
        pdf_bytes = html.write_pdf(stylesheets=[css])
        logger.info("Compilación WeasyPrint completada con éxito.")
        return pdf_bytes
        
    except Exception as e:
        logger.error(f"Error en compilar_html_a_pdf: {str(e)}")
        raise e
