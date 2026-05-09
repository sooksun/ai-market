// Default document templates seeded for new schools.
// Each template uses Handlebars syntax. Triple-stash {{{ }}} ONLY for known-safe HTML.

export interface SeedTemplate {
  templateKey: string;
  nameTh: string;
  category: string;
  description: string;
  htmlContent: string;
}

const STYLE_BLOCK = `
<style>
  body { font-family: 'Sarabun', 'TH Sarabun New', sans-serif; color: #000; line-height: 1.55; }
  .doc { max-width: 720px; margin: 0 auto; padding: 24px; }
  .doc h1 { text-align: center; font-size: 20px; font-weight: 700; margin: 0 0 16px; }
  .doc h2 { font-size: 15px; font-weight: 600; margin-top: 16px; }
  .doc table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .doc th, .doc td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
  .doc th { background: #f1f5f9; font-weight: 600; }
  .doc .right { text-align: right; }
  .doc .center { text-align: center; }
  .doc .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin: 8px 0 12px; font-size: 13px; }
  .doc .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 56px; text-align: center; font-size: 13px; }
  .doc .single-signature { text-align: center; margin-top: 56px; font-size: 13px; }
  .doc .footer-note { margin-top: 24px; font-size: 11px; color: #555; font-style: italic; }
  .doc .ribbon { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 600; }
  .doc ul { padding-left: 20px; }
  @media print {
    .doc { padding: 0; }
    body { font-size: 12px; }
  }
</style>
`;

export const DEFAULT_TEMPLATES: SeedTemplate[] = [
  {
    templateKey: 'memo',
    nameTh: 'บันทึกข้อความขออนุมัติจัดซื้อ',
    category: 'memo',
    description: 'บันทึกข้อความรูปแบบราชการ — ใช้สำหรับเสนออนุมัติจัดซื้อ/จัดจ้าง',
    htmlContent: `${STYLE_BLOCK}
<div class="doc">
  <h1>บันทึกข้อความ</h1>
  <div class="meta">
    <div><b>เลขที่:</b> {{pr.docNo}}</div>
    <div class="right"><b>วันที่:</b> {{formatThaiDate pr.submittedAt}}</div>
    <div><b>ส่วนราชการ:</b> {{school.name}}</div>
    <div></div>
    <div style="grid-column: 1 / -1;"><b>เรื่อง:</b> {{pr.title}}</div>
    <div style="grid-column: 1 / -1;"><b>เรียน:</b> ผู้อำนวยการสถานศึกษา</div>
  </div>

  <p>ด้วย {{pr.requester.fullName}} มีความประสงค์ขอซื้อพัสดุ ดังรายละเอียดต่อไปนี้</p>
  <p><b>เหตุผลความจำเป็น:</b> {{pr.reason}}</p>

  <h2>รายการพัสดุที่ขอซื้อ</h2>
  <table>
    <thead>
      <tr>
        <th class="center" style="width:40px;">ลำดับ</th>
        <th>รายการ</th>
        <th class="right" style="width:60px;">จำนวน</th>
        <th class="center" style="width:60px;">หน่วย</th>
        <th class="right" style="width:90px;">ราคา/หน่วย</th>
        <th class="right" style="width:100px;">รวม</th>
      </tr>
    </thead>
    <tbody>
      {{#each pr.items}}
      <tr>
        <td class="center">{{ordinal}}</td>
        <td>{{name}}{{#if specifications.length}}<ul>{{#each specifications}}<li>{{key}}: {{value}}</li>{{/each}}</ul>{{/if}}</td>
        <td class="right">{{formatNumber quantity}}</td>
        <td class="center">{{unit}}</td>
        <td class="right">{{#if unitPriceEst}}{{formatNumber unitPriceEst}}{{else}}—{{/if}}</td>
        <td class="right">{{#if unitPriceEst}}{{formatNumber lineTotal}}{{else}}—{{/if}}</td>
      </tr>
      {{/each}}
      <tr>
        <td colspan="5" class="right"><b>รวมเป็นเงินทั้งสิ้น</b></td>
        <td class="right"><b>{{#if pr.totalEst}}{{formatNumber pr.totalEst}}{{else}}—{{/if}}</b></td>
      </tr>
    </tbody>
  </table>

  {{#if pr.project}}
  <h2>โครงการ / แหล่งงบประมาณ</h2>
  <p>โครงการ: {{pr.project.name}} (ปีงบประมาณ {{pr.project.fiscalYear}}){{#if pr.budgetSource}} · แหล่งงบ: {{pr.budgetSource.name}} ({{pr.budgetSource.type}}){{/if}}</p>
  {{/if}}

  <p style="margin-top: 16px;">จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ</p>

  <div class="signatures">
    <div>
      <p>(ลงชื่อ) ............................................</p>
      <p>( {{pr.requester.fullName}} )</p>
      <p style="font-size:11px;">ผู้ขอซื้อ</p>
    </div>
    <div>
      <p>(ลงชื่อ) ............................................</p>
      <p>( ............................................ )</p>
      <p style="font-size:11px;">ผู้บังคับบัญชา</p>
    </div>
  </div>

  <div class="single-signature">
    <p>(ลงชื่อ) ............................................</p>
    <p>( ............................................ )</p>
    <p style="font-size:11px;">ผู้อำนวยการสถานศึกษา</p>
  </div>

  <p class="footer-note">เลขที่ {{pr.docNo}} · พิมพ์เมื่อ {{formatDateTime now}} · ระบบ FinProcure AI</p>
</div>
`,
  },
  {
    templateKey: 'comparison_table',
    nameTh: 'ตารางเปรียบเทียบราคา',
    category: 'comparison',
    description: 'ตารางเปรียบเทียบราคาผู้ขายตั้งแต่ 3 รายขึ้นไป พร้อมยอดรวมและความตรงสเปก',
    htmlContent: `${STYLE_BLOCK}
<div class="doc">
  <h1>ตารางเปรียบเทียบราคาและคุณลักษณะ</h1>
  <div class="meta">
    <div><b>เลขที่ PR:</b> {{pr.docNo}}</div>
    <div class="right"><b>วันที่:</b> {{formatThaiDate now}}</div>
    <div style="grid-column: 1 / -1;"><b>เรื่อง:</b> {{pr.title}}</div>
  </div>

  {{#if quotations.length}}
  <table>
    <thead>
      <tr>
        <th>รายการ / ผู้ขาย</th>
        {{#each quotations}}<th class="center">{{vendor.name}}{{#if vendor.rating}}<br/><small>★ {{vendor.rating}}</small>{{/if}}</th>{{/each}}
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td><b>{{ordinal}}.</b> {{name}}<br/><small>{{formatNumber quantity}} {{unit}}</small></td>
        {{#each row}}
          {{#if this.unitPrice}}
            <td class="right">{{formatNumber this.unitPrice}}<br/><small>รวม {{formatNumber this.lineTotal}}</small><br/><span class="ribbon">{{this.specMatch}}</span></td>
          {{else}}
            <td class="center">—</td>
          {{/if}}
        {{/each}}
      </tr>
      {{/each}}
      <tr>
        <td><b>ค่าส่ง</b></td>
        {{#each quotations}}<td class="right">{{formatNumber shippingFee}}</td>{{/each}}
      </tr>
      <tr>
        <td><b>รวมทั้งสิ้น</b></td>
        {{#each quotations}}<td class="right"><b>{{formatNumber grandTotal}}</b></td>{{/each}}
      </tr>
    </tbody>
  </table>

  <h2>การเลือกผู้ขาย</h2>
  {{#if selected}}
  <p><b>ผู้ขายที่เลือก:</b> {{selected.vendor.name}}</p>
  <p><b>เหตุผล:</b> {{selected.selectionReason}}</p>
  {{else}}
  <p><i>ยังไม่ได้เลือกผู้ขาย</i></p>
  {{/if}}
  {{else}}
  <p><i>ยังไม่มีใบเสนอราคา</i></p>
  {{/if}}

  <div class="signatures">
    <div>
      <p>(ลงชื่อ) ............................................</p>
      <p>( ............................................ )</p>
      <p style="font-size:11px;">ผู้จัดทำ (เจ้าหน้าที่พัสดุ)</p>
    </div>
    <div>
      <p>(ลงชื่อ) ............................................</p>
      <p>( ............................................ )</p>
      <p style="font-size:11px;">หัวหน้าเจ้าหน้าที่พัสดุ</p>
    </div>
  </div>

  <p class="footer-note">FinProcure AI · พิมพ์เมื่อ {{formatDateTime now}}</p>
</div>
`,
  },
  {
    templateKey: 'evaluation_report',
    nameTh: 'รายงานพิจารณาผลการเสนอราคา',
    category: 'evaluation',
    description: 'รายงานสรุปการพิจารณาเลือกผู้ขายพร้อมเหตุผลและการตรวจสเปก',
    htmlContent: `${STYLE_BLOCK}
<div class="doc">
  <h1>รายงานพิจารณาผลการเสนอราคา</h1>
  <div class="meta">
    <div><b>เลขที่ PR:</b> {{pr.docNo}}</div>
    <div class="right"><b>วันที่:</b> {{formatThaiDate now}}</div>
    <div style="grid-column: 1 / -1;"><b>เรื่อง:</b> {{pr.title}}</div>
  </div>

  <p>คณะกรรมการ/เจ้าหน้าที่พัสดุได้พิจารณาใบเสนอราคาที่ได้รับ ณ วันที่ {{formatThaiDate now}} จำนวน {{quotations.length}} ราย โดยมีรายละเอียดดังต่อไปนี้</p>

  <h2>สรุปการเสนอราคา</h2>
  <table>
    <thead>
      <tr>
        <th class="center" style="width:40px;">ลำดับ</th>
        <th>ผู้ขาย</th>
        <th>แหล่งที่มา</th>
        <th class="right" style="width:120px;">ราคารวม (บาท)</th>
        <th class="center" style="width:90px;">ตรงสเปก</th>
      </tr>
    </thead>
    <tbody>
      {{#each quotations}}
      <tr>
        <td class="center">{{@index1}}</td>
        <td>{{vendor.name}}</td>
        <td>{{source}}</td>
        <td class="right">{{formatNumber grandTotal}}</td>
        <td class="center">{{#if fullySpecMatched}}✓ ครบ{{else}}— ขาด{{/if}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <h2>ผลการพิจารณา</h2>
  {{#if selected}}
  <p>คณะกรรมการเห็นสมควรเลือก <b>{{selected.vendor.name}}</b> ด้วยราคารวม <b>{{formatNumber selected.grandTotal}}</b> บาท</p>
  <p><b>เหตุผลประกอบการพิจารณา:</b> {{selected.selectionReason}}</p>
  {{else}}
  <p><i>ยังไม่ได้คัดเลือกผู้ขาย</i></p>
  {{/if}}

  {{#if pr.project}}
  <h2>การใช้งบประมาณ</h2>
  <p>เบิกจ่ายจากโครงการ: {{pr.project.name}} (ปีงบประมาณ {{pr.project.fiscalYear}}){{#if pr.budgetSource}} แหล่งงบ: {{pr.budgetSource.name}} ({{pr.budgetSource.type}}){{/if}}</p>
  {{/if}}

  <div class="signatures">
    <div>
      <p>(ลงชื่อ) ............................................</p>
      <p>( ............................................ )</p>
      <p style="font-size:11px;">ประธานคณะกรรมการ</p>
    </div>
    <div>
      <p>(ลงชื่อ) ............................................</p>
      <p>( ............................................ )</p>
      <p style="font-size:11px;">กรรมการ</p>
    </div>
  </div>

  <div class="single-signature">
    <p>(ลงชื่อ) ............................................</p>
    <p>( ............................................ )</p>
    <p style="font-size:11px;">กรรมการ/เลขานุการ</p>
  </div>

  <p class="footer-note">FinProcure AI · พิมพ์เมื่อ {{formatDateTime now}}</p>
</div>
`,
  },
];
