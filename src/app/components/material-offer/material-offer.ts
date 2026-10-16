import { Component, computed, input, output, ElementRef, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import { MaterialOption, MATERIALS } from '../materials/materials';
import {
  OfferFormComponent,
  OfferFormData,
  createDefaultOfferFormData,
} from '../offer-form/offer-form';
import { FIXED_GROUPS } from './fixed-material-offer/fixed-material-offer';
import { extractPdfField, GROUP_PATTERN } from '../../utils/regex-patterns';
import { registerFonts } from '../../utils/pdf-fonts';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

@Component({
  selector: 'app-material-offer',
  templateUrl: './material-offer.html',
  imports: [
    TableModule,
    DecimalPipe,
    FormsModule,
    InputNumberModule,
    DatePickerModule,
    ButtonModule,
    OfferFormComponent,
  ],
})
export class MaterialOfferComponent {
  selectedOptions = input<MaterialOption[]>([]);
  quantityChanged = output<{ index: number; quantity: number }>();
  priceChanged = output<{ index: number; price: number }>();
  nameChanged = output<{ index: number; name: string }>();
  unitChanged = output<{ index: number; unit: string }>();
  optionRemoved = output<number>();
  materialsImported = output<MaterialOption[]>();

  fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  energyPercent = 5;
  transformerMass: number | null = null;
  date: Date | null = new Date();
  formData: OfferFormData = createDefaultOfferFormData();

  private readonly titleOrder = MATERIALS.map((m) => m.title);

  private readonly displayTitleMap: Record<string, string> = {};

  private getDisplayTitle(title: string): string {
    return this.displayTitleMap[title] ?? title;
  }

  sortedOptions = computed(() => {
    const sorted = this.selectedOptions()
      .map((opt, index) =>
        Object.assign(opt, {
          originalIndex: index,
          isGroupStart: false,
          displayTitle: this.getDisplayTitle(opt.title ?? ''),
        })
      )
      .sort((a, b) => {
        const aIdx = this.titleOrder.indexOf(a.title ?? '');
        const bIdx = this.titleOrder.indexOf(b.title ?? '');
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      });

    let lastDisplayTitle = '';
    for (const opt of sorted) {
      if (opt.displayTitle && opt.displayTitle !== lastDisplayTitle) {
        opt.isGroupStart = true;
        lastDisplayTitle = opt.displayTitle;
      }
    }

    return sorted;
  });

  get total(): number {
    return this.selectedOptions().reduce((sum, opt) => sum + opt.price * opt.quantity, 0);
  }

  get totalWithEnergy(): number {
    return this.total * (1 + this.energyPercent / 100);
  }

  /** Everything except the labour group ('h' — Rad). */
  get materialsTotal(): number {
    return this.selectedOptions()
      .filter((opt) => opt.group !== 'h')
      .reduce((sum, opt) => sum + opt.price * opt.quantity, 0);
  }

  /** The labour group ('h' — Rad) only. */
  get laborTotal(): number {
    return this.selectedOptions()
      .filter((opt) => opt.group === 'h')
      .reduce((sum, opt) => sum + opt.price * opt.quantity, 0);
  }

  onQuantityChange(index: number, quantity: number) {
    this.quantityChanged.emit({ index, quantity });
  }

  onPriceChange(index: number, price: number) {
    this.priceChanged.emit({ index, price });
  }

  onNameChange(index: number, name: string) {
    this.nameChanged.emit({ index, name });
  }

  onUnitChange(index: number, unit: string) {
    this.unitChanged.emit({ index, unit });
  }

  onRemove(index: number) {
    this.optionRemoved.emit(index);
  }

  formatDate(date: Date | null): string {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  async saveToPdf() {
    const doc = new jsPDF();
    await registerFonts(doc);

    // Add logo image
    const logoImg = await this.loadImage('assets/kolektor.png');
    const logoWidth = 50;
    const logoHeight = logoWidth * (logoImg.height / logoImg.width);
    doc.addImage(logoImg, 'PNG', 11, 12, logoWidth, logoHeight);

    doc.setFontSize(14);
    doc.text('PREDKALKULACIJA', 14, 30);

    doc.setFontSize(10);
    doc.text(`Datum: ${this.formatDate(this.date)}`, 120, 20);

    const brojPonude = this.formData.offerCode
      ? `${this.formData.offerPrefix}${this.formData.offerCode}${this.formData.offerSuffix}`
      : '';
    const brojTehnike = this.formData.technicalCode
      ? `${this.formData.technicalPrefix}${this.formData.technicalCode}${this.formData.technicalSuffix}`
      : '';

    let yPos = 45;
    doc.text(`Broj ponude: ${brojPonude}`, 14, yPos);
    doc.text(`Broj tehnike: ${brojTehnike}`, 120, yPos);
    yPos += 7;
    doc.text(`Kupac: ${this.formData.customerName}`, 14, yPos);
    doc.text(`Broj komada: ${this.formData.numberOfCommands ?? ''}`, 120, yPos);
    yPos += 7;
    doc.text(`Tip: ${this.formData.transformerType}`, 14, yPos);
    doc.text(`Komercijalista: ${this.formData.salespersonName}`, 120, yPos);
    yPos += 7;
    doc.text(`Zemlja: ${this.formData.country}`, 14, yPos);
    doc.text(`Projektant: ${this.formData.designerName}`, 120, yPos);

    // Totals block, between the header fields and the group summary table.
    // The transformer mass row is pinned to the bottom of this page instead.
    const totalsEndY = this.drawTotals(doc, yPos + 14);

    // Material summary table
    const groupSummaryData = this.getGroupSummaryData();
    autoTable(doc, {
      startY: totalsEndY + 12,
      head: [
        [
          'Grupa',
          { content: 'Cena (€)', styles: { halign: 'right' } },
          { content: 'Udeo', styles: { halign: 'right' } },
        ],
      ],
      body: groupSummaryData.map((g) => [
        g.name,
        this.formatNumber(g.total),
        `${g.percentage.toFixed(2)} %`,
      ]),
      styles: { font: 'Roboto', fontSize: 10 },
      headStyles: { fillColor: [66, 66, 66] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
      },
    });

    // Materials table (grouped by category)
    const sorted = this.sortedOptions();
    const tableBody: any[][] = [];
    let currentTitle = '';
    let position = 1;

    for (const opt of sorted) {
      if (opt.title && opt.title !== currentTitle) {
        currentTitle = opt.title;
        tableBody.push([
          {
            content: currentTitle,
            colSpan: 7,
            styles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [0, 0, 0] },
          },
        ]);
      }
      tableBody.push([
        position++,
        opt.name,
        this.formatNumber(opt.price),
        opt.quantity.toLocaleString('de-DE'),
        opt.unit,
        this.formatNumber(opt.price * opt.quantity),
        opt.group,
      ]);
    }

    // Transformer mass pinned to the bottom of page 1
    this.drawTransformerMass(doc, doc.internal.pageSize.getHeight() - 20);

    // Materials table starts on its own page — page 1 holds only the header,
    // the totals block and the group summary table.
    doc.addPage();

    autoTable(doc, {
      startY: 20,
      head: [
        [
          'Poz.',
          'Naziv',
          { content: 'Cena (€)', styles: { halign: 'right' } },
          { content: 'Kolicina', styles: { halign: 'right' } },
          'JM',
          { content: 'Ukupna cena', styles: { halign: 'right' } },
          'Grupa',
        ],
      ],
      body: tableBody,
      showFoot: false,
      styles: { font: 'Roboto', fontSize: 10 },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      headStyles: { fillColor: [66, 66, 66] },
      columnStyles: {
        0: { cellWidth: 12 },
        2: { halign: 'right', cellWidth: 22 },
        3: { halign: 'right', cellWidth: 20 },
        4: { cellWidth: 15 },
        5: { halign: 'right', cellWidth: 30 },
        6: { cellWidth: 14 },
      },
    });

    this.drawTotalsAfterTable(doc);

    // Fixed material offer table (Pregled predkalkulacije)
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('Roboto', 'bold');
    doc.text('PREGLED PREDKALKULACIJE', 14, 20);

    const options = this.selectedOptions();
    const fixedBody: any[][] = [];

    for (const group of FIXED_GROUPS) {
      fixedBody.push([
        {
          content: `${group.name}:`,
          colSpan: 7,
          styles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [0, 0, 0] },
        },
      ]);

      const groupOptions = options
        .filter((opt) => group.titles.includes(opt.title ?? ''))
        .sort((a, b) => {
          const aIdx = group.titles.indexOf(a.title ?? '');
          const bIdx = group.titles.indexOf(b.title ?? '');
          return aIdx - bIdx;
        });

      for (let pos = group.startPos; pos <= group.endPos; pos++) {
        const optIndex = pos - group.startPos;
        const opt = groupOptions[optIndex];

        if (opt) {
          fixedBody.push([
            `${pos}.`,
            opt.name,
            this.formatNumber(opt.price),
            opt.quantity,
            opt.unit,
            opt.group,
            this.formatNumber(opt.price * opt.quantity),
          ]);
        } else {
          fixedBody.push([`${pos}.`, '', '', '', '', '', '']);
        }
      }
    }

    autoTable(doc, {
      startY: 30,
      head: [
        [
          'Poz.',
          'Naziv',
          { content: 'Cena (€)', styles: { halign: 'right' } },
          { content: 'Kolicina', styles: { halign: 'right' } },
          'JM',
          'Grupa',
          { content: 'Cena (€)', styles: { halign: 'right' } },
        ],
      ],
      body: fixedBody,
      showFoot: false,
      styles: { font: 'Roboto', fontSize: 10 },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      headStyles: { fillColor: [66, 66, 66] },
      columnStyles: {
        0: { cellWidth: 12 },
        2: { halign: 'right', cellWidth: 22 },
        3: { halign: 'right', cellWidth: 20 },
        4: { cellWidth: 15 },
        5: { cellWidth: 18 },
        6: { halign: 'right', cellWidth: 28 },
      },
    });

    this.drawTotalsAfterTable(doc);

    doc.save(`${this.baseFileName()}.pdf`);
  }

  /** Materials in table order, one row each — no group title rows. */
  saveToExcel() {
    const rows = this.sortedOptions().map((opt, index) => ({
      'Poz.': index + 1,
      Naziv: opt.name,
      'Cena (€)': opt.price,
      Kolicina: opt.quantity,
      JM: opt.unit,
      'Ukupna cena (€)': opt.price * opt.quantity,
      Grupa: opt.group,
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet['!cols'] = [
      { wch: 6 },
      { wch: 45 },
      { wch: 12 },
      { wch: 10 },
      { wch: 8 },
      { wch: 16 },
      { wch: 8 },
    ];

    // Two decimals on the price and line total columns (C and F)
    for (let row = 2; row <= rows.length + 1; row++) {
      for (const col of ['C', 'F']) {
        const cell = sheet[`${col}${row}`];
        if (cell) cell.z = '#,##0.00';
      }
    }

    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Predkalkulacija');
    XLSX.writeFile(book, `${this.baseFileName()}.xlsx`);
  }

  private baseFileName(): string {
    const ponuda = this.formData.offerCode
      ? `${this.formData.offerPrefix}${this.formData.offerCode}${this.formData.offerSuffix}`
      : 'P';
    const tehnika = this.formData.technicalCode
      ? `${this.formData.technicalPrefix}${this.formData.technicalCode}${this.formData.technicalSuffix}`
      : 'T';
    return `KALKP_${ponuda}_${tehnika}`;
  }

  /**
   * Draws the totals block below the table that was just rendered, moving it to
   * a new page when it would not fit under the table.
   */
  private drawTotalsAfterTable(doc: jsPDF) {
    const blockHeight = 28; // first to last baseline of the totals block
    const pageHeight = doc.internal.pageSize.getHeight();
    let startY = (doc as any).lastAutoTable.finalY + 12;

    if (startY + blockHeight > pageHeight - 15) {
      doc.addPage();
      startY = 20;
    }

    this.drawTotals(doc, startY);
  }

  /** Draws the totals block starting at `startY`; returns the y of its last line. */
  private drawTotals(doc: jsPDF, startY: number): number {
    const marginLeft = 14;
    const valueX = doc.internal.pageSize.getWidth() - 14;
    let y = startY;

    doc.setFontSize(10);
    doc.setFont('Roboto', 'bold');

    const rows: [string, number][] = [
      ['Ukupna cena materijala:', this.materialsTotal],
      ['Proizvodni sati:', this.laborTotal],
      [`Energetski dodatak (${this.energyPercent}%):`, (this.total * this.energyPercent) / 100],
      ['Ukupna cena:', this.totalWithEnergy],
    ];

    const rowGap = 7;
    rows.forEach(([label, value], index) => {
      const isLast = index === rows.length - 1;
      // The grand total gets a double gap with its separator centred in it,
      // so the whitespace above and below the line matches.
      if (index > 0) y += isLast ? rowGap * 2 : rowGap;
      if (isLast) {
        doc.setDrawColor(150, 150, 150);
        doc.line(marginLeft, y - rowGap - 1, valueX, y - rowGap - 1);
      }
      doc.text(label, marginLeft, y);
      doc.text(`${this.formatNumber(value)} €`, valueX, y, { align: 'right' });
    });

    doc.setFont('Roboto', 'normal');
    return y;
  }

  /** Draws the transformer mass row (with its separator line) at `y`; returns `y`. */
  private drawTransformerMass(doc: jsPDF, y: number): number {
    if (!this.transformerMass) return y;

    const marginLeft = 14;
    const valueX = doc.internal.pageSize.getWidth() - 14;

    doc.setFontSize(10);
    doc.setFont('Roboto', 'bold');
    doc.setDrawColor(150, 150, 150);
    doc.line(marginLeft, y - 7, valueX, y - 7);

    doc.text(`Masa Transformatora: ${Math.round(this.transformerMass)} kg`, marginLeft, y);
    doc.text(`${this.formatNumber(this.totalWithEnergy / this.transformerMass)} €/kg`, valueX, y, {
      align: 'right',
    });

    doc.setFont('Roboto', 'normal');
    return y;
  }

  private formatNumber(value: number): string {
    return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private getGroupSummaryData(): {
    name: string;
    code: string;
    total: number;
    percentage: number;
  }[] {
    const groupConfig = [
      { code: 'Cu', name: 'Bakar (Cu)' },
      { code: 'Fe', name: 'Magnetno jezgro (Fe)' },
      { code: 'Fei', name: 'Celik (Fei)' },
      { code: 'Pap', name: 'Papir (Pap)' },
      { code: 'Oil', name: 'Ulje (Oil)' },
      { code: 'h', name: 'Rad (h)' },
      { code: 'n', name: 'Drugi materijali (n)' },
    ];

    const options = this.selectedOptions();
    const grandTotal = this.total;

    return groupConfig.map((group) => {
      const groupOptions = options.filter((opt) => opt.group === group.code);
      const total = groupOptions.reduce((sum, opt) => sum + opt.price * opt.quantity, 0);
      const percentage = grandTotal > 0 ? (total / grandTotal) * 100 : 0;

      return {
        name: group.name,
        code: group.code,
        total,
        percentage,
      };
    });
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  triggerFileInput() {
    this.fileInput()?.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      this.parsePdfContent(fullText);
    } catch (error) {
      console.error('Error parsing PDF:', error);
    }

    input.value = '';
  }

  private parsePdfContent(text: string) {
    const dateMatch = text.match(/Datum:\s*(\d{2}\.\d{2}\.\d{4})/);
    if (dateMatch) {
      const [day, month, year] = dateMatch[1].split('.').map(Number);
      this.date = new Date(year, month - 1, day);
    }

    const defaults = createDefaultOfferFormData();

    // Extract Broj ponude: <prefix><code><suffix> (e.g. P26-0015.1.1)
    const offerMatch = text.match(/Broj ponude:\s*(\S*?-)(\d+)(\.[\d.]+)/);
    const offerPrefix = offerMatch?.[1] ?? defaults.offerPrefix;
    const offerCode = offerMatch?.[2] ?? '';
    const offerSuffix = offerMatch?.[3] ?? '.1.1';

    // Extract Broj tehnike: <prefix><code><suffix> (e.g. T26-0015.0)
    const techMatch = text.match(/Broj tehnike:\s*(\S*?-)(\d+)(\.[\d.]+)/);
    const technicalPrefix = techMatch?.[1] ?? defaults.technicalPrefix;
    const technicalCode = techMatch?.[2] ?? '';
    const technicalSuffix = techMatch?.[3] ?? '.0';

    const customerName = extractPdfField(text, 'Kupac', ['Broj komada:', 'Tip:']);

    const komadaMatch = text.match(/Broj komada:\s*(\d+)/);
    const numberOfCommands = komadaMatch ? parseInt(komadaMatch[1]) : null;

    const transformerType = extractPdfField(text, 'Tip', ['Komercijalista:', 'Zemlja:']);
    const salespersonName = extractPdfField(text, 'Komercijalista', ['Zemlja:', 'Grupa', 'Poz.']);
    const country = extractPdfField(text, 'Zemlja', ['Projektant:', 'Grupa', 'Poz.']);
    const designerName = extractPdfField(text, 'Projektant', [
      'Ukupna cena materijala:',
      'UKUPNO:',
      'Grupa',
      'Poz.',
    ]);

    this.formData = {
      offerPrefix,
      offerCode,
      offerSuffix,
      technicalPrefix,
      technicalCode,
      technicalSuffix,
      customerName,
      numberOfCommands,
      transformerType,
      salespersonName,
      designerName,
      country,
    };

    // Current layout prints "Energetski dodatak (5%):"; older PDFs printed
    // "Ukupna cena + 5% energetski dodatak" instead.
    const energyMatch =
      text.match(/Energetski dodatak\s*\(([\d.,]+)%\)/) ??
      text.match(/Ukupna cena \+\s*([\d.,]+)%\s*energetski dodatak/);
    if (energyMatch) {
      this.energyPercent = parseFloat(energyMatch[1].replace(/,/g, ''));
    }

    const massMatch = text.match(/Masa Transformatora:\s*([\d,]+\.?\d*)\s*kg/);
    if (massMatch) {
      this.transformerMass = parseFloat(massMatch[1].replace(/,/g, ''));
    }

    const materials = this.parseTableData(text);
    if (materials.length > 0) {
      materials.sort((a, b) => {
        const aIdx = this.titleOrder.indexOf(a.title ?? '');
        const bIdx = this.titleOrder.indexOf(b.title ?? '');
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      });
      this.materialsImported.emit(materials);
    }
  }

  private parseTableData(text: string): MaterialOption[] {
    const materials: MaterialOption[] = [];

    // Skip to first materials table header (removes metadata and summary table)
    const tableStartIndex = text.search(/Poz\.?\s*Naziv/i);
    if (tableStartIndex < 0) return materials;

    // Remove UKUPNO footers and table headers to prevent false regex matches
    const tableText = text
      .substring(tableStartIndex)
      .replace(
        /Poz\.?\s*Naziv\s*Cena\s*(?:\([^)]*\))?\s*Kolicina\s*JM\s*Ukupna cena\s*(?:\([^)]*\))?\s*(?:Grupa)?/gi,
        ' '
      )
      .replace(/UKUPNO:?\s*[\d,.]+/gi, ' ')
      // Totals block printed under each table. The colon is what separates these
      // from a real row such as "58. Proizvodni sati 63,00 1 h h 63,00".
      .replace(
        /(?:Ukupna cena materijala|Proizvodni sati|Ukupna cena|Energetski dodatak\s*\([\d.,]+%\)):\s*[\d.,]+\s*€?/gi,
        ' '
      )
      .replace(/Masa Transformatora:\s*[\d.,]+\s*kg\s*[\d.,]+\s*€\/kg/gi, ' ');

    // Locate section-title markers (e.g. "Rad", "Izolatori") so items whose names
    // were edited and no longer match MATERIALS still retain their group heading.
    const titlePattern = this.titleOrder
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    const titleRegex = new RegExp(`(?:^|\\s)(${titlePattern})(?=\\s|$)`, 'g');
    const titleMarkers: { index: number; title: string }[] = [];
    let titleMatch: RegExpExecArray | null;
    while ((titleMatch = titleRegex.exec(tableText)) !== null) {
      titleMarkers.push({
        index: titleMatch.index + titleMatch[0].length - titleMatch[1].length,
        title: titleMatch[1],
      });
    }
    // Use the last title marker at or before `end` — include titles that fall inside
    // the match region, since pdfjs can emit the row's position number before the
    // section title at the same y-coordinate.
    const titleAt = (end: number): string | undefined => {
      let current: string | undefined;
      for (const m of titleMarkers) {
        if (m.index < end) current = m.title;
        else break;
      }
      return current;
    };

    // Blank out the section titles so the non-greedy name capture below can't swallow
    // them — pdfjs sometimes extracts the header label inline with row data. Replace
    // with same-length whitespace to keep indices aligned with `titleMarkers`.
    const parseText = titleMarkers.reduce((acc, m) => {
      return (
        acc.slice(0, m.index) + ' '.repeat(m.title.length) + acc.slice(m.index + m.title.length)
      );
    }, tableText);

    // Try new format first (with Grupa column at the end)
    // Row format: "1 MaterialName 7,00 12.800 kg 89.600,00 Fe" (de-DE format)
    const newFormatRegex = new RegExp(
      `(\\d+)\\s+(.+?)\\s+([\\d.]+,\\d{2})\\s+([\\d.,]+)\\s+(\\S+)\\s+([\\d.]+,\\d{2})\\s+(${GROUP_PATTERN})(?=\\s|$)`,
      'g'
    );

    let match;
    while ((match = newFormatRegex.exec(parseText)) !== null) {
      const pos = match[1];
      // Strip a duplicate of the position number at the start of the name — pdfjs
      // sometimes emits the position twice across the section-title boundary.
      const name = match[2].trim().replace(new RegExp(`^${pos}\\s+`), '');
      const price = parseFloat(match[3].replace(/\./g, '').replace(',', '.'));
      const quantity = parseFloat(match[4].replace(/\./g, '').replace(',', '.'));
      const unit = match[5];
      const group = match[7];

      if (name && !isNaN(price) && !isNaN(quantity)) {
        const info = this.findMaterialInfo(name);
        const title = info.title ?? titleAt(match.index + match[0].length);
        materials.push({ name, price, quantity, unit, group, title });
      }
    }

    if (materials.length > 0) return materials;

    // Fallback: legacy format without Grupa column
    // Row format: "1 MaterialName 7,00 12.800 kg 89.600,00" (de-DE format)
    const legacyRegex = /(\d+)\s+(.+?)\s+([\d.]+,\d{2})\s+([\d.,]+)\s+(\S+)\s+([\d.]+,\d{2})/g;

    while ((match = legacyRegex.exec(parseText)) !== null) {
      const pos = match[1];
      const name = match[2].trim().replace(new RegExp(`^${pos}\\s+`), '');
      const price = parseFloat(match[3].replace(/\./g, '').replace(',', '.'));
      const quantity = parseFloat(match[4].replace(/\./g, '').replace(',', '.'));
      const unit = match[5];

      if (name && !isNaN(price) && !isNaN(quantity)) {
        const info = this.findMaterialInfo(name);
        const title = info.title ?? titleAt(match.index + match[0].length);
        materials.push({ name, price, quantity, unit, group: info.group, title });
      }
    }

    return materials;
  }

  private findMaterialInfo(name: string): { group: string; title?: string } {
    const normalizedName = name.toLowerCase().trim();
    for (const material of MATERIALS) {
      for (const option of material.options) {
        if (option.name.toLowerCase().trim() === normalizedName) {
          return { group: option.group, title: material.title };
        }
      }
    }
    return { group: 'n' };
  }
}
