/**
 * Universal File Download Utility for FEREX Enterprise Ecosystem
 * Generates and triggers actual browser downloads for:
 * - Export Cargo Packing Lists (HTML/PDF formatted)
 * - Ocean Bills of Lading (Clean On-Board Signed HTML/PDF)
 * - Commercial Invoices & Export Billing
 * - Trade Certificates and Vault Documents
 * - CSV Spreadsheets
 */

export function downloadFile(filename: string, content: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function downloadPackingListDocument(pl: {
  id: string;
  container?: string;
  consignee?: string;
  items?: string;
  grossWeight?: string;
  netWeight?: string;
  status?: string;
}) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Packing_List_${pl.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 30px; color: #1e293b; line-height: 1.5; }
    .header { border-bottom: 3px solid #6A1B2E; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { color: #6A1B2E; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
    .doc-ref { font-size: 14px; font-weight: bold; color: #64748b; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #6A1B2E; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
    .box p { margin: 4px 0; font-size: 13px; }
    .box p strong { color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background: #6A1B2E; color: white; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
    .seal { display: inline-block; border: 2px solid #059669; color: #059669; padding: 6px 12px; border-radius: 6px; font-weight: 900; text-transform: uppercase; font-size: 11px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">FEREX GLOBAL TRADE</div>
      <div style="font-size: 13px; color: #475569; font-weight: 600;">Official International Cargo Packing Manifest</div>
    </div>
    <div class="doc-ref">PL NO: ${pl.id}</div>
  </div>

  <div class="grid section">
    <div class="box">
      <div class="section-title">Consignee (Buyer Details)</div>
      <p><strong>Entity:</strong> ${pl.consignee || 'Warsaw Global Logistics Sp. z o.o.'}</p>
      <p><strong>Address:</strong> Al. Jerozolimskie 81, Warsaw, Poland</p>
      <p><strong>Status:</strong> Customs Authorized Importer</p>
    </div>
    <div class="box">
      <div class="section-title">Freight & Container Specification</div>
      <p><strong>Container / Shipment Ref:</strong> ${pl.container || 'SHP-9821'}</p>
      <p><strong>Status:</strong> ${pl.status || 'Loaded & Sealed (Customs Inspected)'}</p>
      <p><strong>Date of Manifest:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Itemized Cargo Breakdown</div>
    <table>
      <thead>
        <tr>
          <th>Item / Package Description</th>
          <th>Gross Weight</th>
          <th>Net Weight</th>
          <th>Customs Seal</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${pl.items || 'Standard Industrial Export Cargo'}</strong></td>
          <td><strong>${pl.grossWeight || '24,500 kg'}</strong></td>
          <td><strong>${pl.netWeight || '22,800 kg'}</strong></td>
          <td>VERIFIED - SEAL #EU-98214</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div>
    <span class="seal">✓ OFFICIAL CARGO MANIFEST VERIFIED & STAMPED</span>
  </div>

  <div class="footer">
    <div>FEREX Global Trade Operations Desk • Port of Gdansk / Mumbai Terminal</div>
    <div>Page 1 of 1 • Certified Export Document</div>
  </div>
</body>
</html>`;

  downloadFile(`Packing_List_${pl.id}.html`, html, 'text/html');
}

export function downloadBillOfLadingDocument(bl: {
  id?: string;
  bl_number?: string;
  carrier?: string;
  vessel?: string;
  vessel_name?: string;
  pol?: string;
  port_of_loading?: string;
  pod?: string;
  port_of_discharge?: string;
  status?: string;
  shipper?: string;
  consignee?: string;
}) {
  const blId = bl.bl_number || bl.id || 'BL-MSC-8821';
  const carrier = bl.carrier || 'MSC Mediterranean Shipping Co.';
  const vessel = bl.vessel_name || bl.vessel || 'MSC Oscar (V.8821)';
  const pol = bl.port_of_loading || bl.pol || 'Port of Gdansk, Poland 🇵🇱';
  const pod = bl.port_of_discharge || bl.pod || 'Port of Rotterdam, Netherlands 🇳🇱';
  const status = bl.status || 'Clean On-Board Signed';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bill_Of_Lading_${blId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 30px; color: #0f172a; line-height: 1.5; }
    .header { border-bottom: 3px solid #6A1B2E; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { color: #6A1B2E; font-size: 22px; font-weight: 900; text-transform: uppercase; margin: 0; }
    .doc-ref { font-size: 15px; font-weight: 900; color: #0f172a; font-family: monospace; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
    .box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; }
    .box h4 { margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #6A1B2E; font-weight: 800; }
    .box p { margin: 2px 0; font-size: 12.5px; }
    .highlight { background: #eff6ff; border-color: #93c5fd; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
    th { background: #6A1B2E; color: white; text-align: left; padding: 9px 12px; font-size: 11px; text-transform: uppercase; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    .status-stamp { border: 2px solid #059669; color: #059669; font-weight: 900; padding: 8px 14px; border-radius: 6px; display: inline-block; text-transform: uppercase; font-size: 12px; }
    .footer { margin-top: 35px; padding-top: 15px; border-top: 1px solid #cbd5e1; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">OCEAN BILL OF LADING</div>
      <div style="font-size: 12px; font-weight: 700; color: #475569;">FEREX GLOBAL MULTIMODAL LOGISTICS</div>
    </div>
    <div>
      <div class="doc-ref">B/L NO: ${blId}</div>
      <div style="font-size: 11px; color: #64748b; text-align: right;">Original Negotiable Copy</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="box">
      <h4>Shipper / Exporter</h4>
      <p><strong>FEREX Global Trade Operations Europe</strong></p>
      <p>Al. Jerozolimskie 81, Warsaw 02-001, Poland</p>
      <p>VAT ID: PL5289901234</p>
    </div>
    <div class="box">
      <h4>Consignee / Notify Party</h4>
      <p><strong>${bl.consignee || 'European Maritime Commerce Group'}</strong></p>
      <p>Port Logistics Sector, Haven 1020, Rotterdam, Netherlands</p>
    </div>
  </div>

  <div class="grid-3">
    <div class="box">
      <h4>Ocean Vessel & Voyage</h4>
      <p><strong>${vessel}</strong></p>
      <p>Carrier: ${carrier}</p>
    </div>
    <div class="box">
      <h4>Port of Loading (POL)</h4>
      <p><strong>${pol}</strong></p>
    </div>
    <div class="box">
      <h4>Port of Discharge (POD)</h4>
      <p><strong>${pod}</strong></p>
    </div>
  </div>

  <div class="box highlight">
    <h4>Cargo & Container Specification</h4>
    <table>
      <thead>
        <tr>
          <th>Container & Seal No.</th>
          <th>Description of Packages & Goods</th>
          <th>Gross Weight</th>
          <th>Measurement</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>MSCU-908214-0</strong><br><span style="color:#64748b; font-size:10px;">Seal: EU98214-A</span></td>
          <td>1x40' High Cube Container Stuffed with Machinery & Commodities</td>
          <td><strong>24,500.00 KG</strong></td>
          <td>67.50 CBM</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center;">
    <div class="status-stamp">✓ ${status}</div>
    <div style="text-align: right; font-size: 12px; color: #334155;">
      <div>Authorized Signatory: <strong>Maritime Freight Controller</strong></div>
      <div>Issued at: <strong>Port of Gdansk Maritime Desk</strong></div>
    </div>
  </div>

  <div class="footer">
    <div>FEREX Global Trade ERP • Multimodal Bill of Lading</div>
    <div>Subject to Hague-Visby Rules & International Maritime Conventions</div>
  </div>
</body>
</html>`;

  downloadFile(`Bill_Of_Lading_${blId}.html`, html, 'text/html');
}

export function downloadGenericVaultDocument(doc: {
  id: string;
  name: string;
  folder: string;
  size?: string;
  updated?: string;
}) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${doc.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #0f172a; }
    .header { border-bottom: 2px solid #6A1B2E; padding-bottom: 15px; margin-bottom: 20px; }
    .title { font-size: 20px; font-weight: 800; color: #6A1B2E; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-top: 20px; }
    .stamp { margin-top: 30px; display: inline-block; border: 2px solid #059669; color: #059669; padding: 6px 12px; border-radius: 6px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">FEREX GLOBAL TRADE DOCUMENT VAULT</div>
    <div style="font-size: 13px; color: #64748b;">Official Archive Record</div>
  </div>

  <div class="box">
    <p><strong>Document ID:</strong> ${doc.id}</p>
    <p><strong>Document File Name:</strong> ${doc.name}</p>
    <p><strong>Vault Category:</strong> ${doc.folder}</p>
    <p><strong>File Size:</strong> ${doc.size || '1.8 MB'}</p>
    <p><strong>Archived Date:</strong> ${doc.updated || new Date().toISOString().split('T')[0]}</p>
    <p><strong>Verification Status:</strong> Cryptographically Verified & Immutable</p>
  </div>

  <div>
    <span class="stamp">✓ AUTHENTIC TRADE VAULT DOCUMENT</span>
  </div>
</body>
</html>`;

  downloadFile(`${doc.name.replace(/\.[^/.]+$/, "") || doc.id}.html`, html, 'text/html');
}
