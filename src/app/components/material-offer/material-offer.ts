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
import { MaterialOption, MATERIALS } from '../materials/materials';
import { OfferFormComponent, OfferFormData } from '../offer-form/offer-form';
import { MaterialSummaryComponent } from '../offer-form/material-summary/material-summary';
import { FIXED_GROUPS } from './fixed-material-offer/fixed-material-offer';
import { extractPdfField, GROUP_PATTERN } from '../../utils/regex-patterns';

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
    MaterialSummaryComponent,
  ],
})
export class MaterialOfferComponent {
  selectedOptions = input<MaterialOption[]>([]);
  quantityChanged = output<{ index: number; quantity: number }>();
  priceChanged = output<{ index: number; price: number }>();
  optionRemoved = output<number>();
  materialsImported = output<MaterialOption[]>();

  fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  energyPercent = 5;
  transformerMass: number | null = null;
  date: Date | null = new Date();
  formData: OfferFormData = {
    offerCode: '',
    offerSuffix: '.1.1',
    customerName: '',
    transformerType: '',
    salespersonName: '',
    technicalCode: '',
    technicalSuffix: '.0',
    numberOfCommands: null,
  };

  private readonly titleOrder = MATERIALS.map((m) => m.title);

  sortedOptions = computed(() => {
    const sorted = this.selectedOptions()
      .map((opt, index) => ({ ...opt, originalIndex: index, isGroupStart: false }))
      .sort((a, b) => {
        const aIdx = this.titleOrder.indexOf(a.title ?? '');
        const bIdx = this.titleOrder.indexOf(b.title ?? '');
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      });

    let lastTitle = '';
    for (const opt of sorted) {
      if (opt.title && opt.title !== lastTitle) {
        opt.isGroupStart = true;
        lastTitle = opt.title;
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

  get yearSuffix(): string {
    return new Date().getFullYear().toString().slice(-2);
  }

  onQuantityChange(index: number, quantity: number) {
    this.quantityChanged.emit({ index, quantity });
  }

  onPriceChange(index: number, price: number) {
    this.priceChanged.emit({ index, price });
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

    // Add logo image
    const logoImg = await this.loadImage('assets/kolektor.png');
    const logoWidth = 50;
    const logoHeight = logoWidth * (logoImg.height / logoImg.width);
    doc.addImage(logoImg, 'PNG', 11, 12, logoWidth, logoHeight);

    doc.setFontSize(14);
    doc.text('PREDKALKULACIJA', 14, 30);

    doc.setFontSize(10);
    doc.text(`Datum: ${this.formatDate(this.date)}`, 150, 20);

    let yPos = 45;
    doc.text(
      `Broj ponude: P${this.yearSuffix}-${this.formData.offerCode}${this.formData.offerSuffix}`,
      14,
      yPos
    );
    doc.text(
      `Broj tehnike: T${this.yearSuffix}-${this.formData.technicalCode}${this.formData.technicalSuffix}`,
      110,
      yPos
    );
    yPos += 7;
    doc.text(`Kupac: ${this.formData.customerName}`, 14, yPos);
    doc.text(`Broj komada: ${this.formData.numberOfCommands ?? ''}`, 110, yPos);
    yPos += 7;
    doc.text(`Tip Transformatora: ${this.formData.transformerType}`, 14, yPos);
    yPos += 7;
    doc.text(`Komercijalista: ${this.formData.salespersonName}`, 14, yPos);

    // Material summary table
    const groupSummaryData = this.getGroupSummaryData();
    autoTable(doc, {
      startY: yPos + 10,
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
      styles: { font: 'helvetica', fontSize: 10 },
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

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
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
      styles: { font: 'helvetica', fontSize: 10 },
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

    // Footer drawn manually below the table
    const finalY = (doc as any).lastAutoTable.finalY;
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 14;
    const valueX = pageWidth - 14;
    let footY = finalY + 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    doc.text('UKUPNO:', marginLeft, footY);
    doc.text(this.formatNumber(this.total), valueX, footY, { align: 'right' });

    footY += 7;
    doc.text(`Ukupna cena + ${this.energyPercent}% energetski dodatak:`, marginLeft, footY);
    doc.text(this.formatNumber(this.totalWithEnergy), valueX, footY, { align: 'right' });

    if (this.transformerMass) {
      footY += 7;
      doc.text(
        `Masa Transformatora: ${this.formatNumber(this.transformerMass)} kg`,
        marginLeft,
        footY
      );
      doc.text(
        `${this.formatNumber(this.totalWithEnergy / this.transformerMass)} €/kg`,
        valueX,
        footY,
        { align: 'right' }
      );
    }

    // Fixed material offer table (Pregled predkalkulacije)
    doc.addPage();
    doc.setFontSize(14);
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
          { content: 'Količina', styles: { halign: 'right' } },
          'JM',
          'Grupa',
          { content: 'Cena (€)', styles: { halign: 'right' } },
        ],
      ],
      body: fixedBody,
      showFoot: false,
      styles: { font: 'helvetica', fontSize: 10 },
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

    // Fixed table footer
    const fixedFinalY = (doc as any).lastAutoTable.finalY;
    let fixedFootY = fixedFinalY + 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('UKUPNO:', marginLeft, fixedFootY);
    doc.text(this.formatNumber(this.total), valueX, fixedFootY, { align: 'right' });

    const brojPonude = `P${this.yearSuffix}-${this.formData.offerCode}${this.formData.offerSuffix}`;
    const brojTehnike = `T${this.yearSuffix}-${this.formData.technicalCode}${this.formData.technicalSuffix}`;
    doc.save(`KALKP_${brojPonude}_${brojTehnike}.pdf`);
  }

  private formatNumber(value: number): string {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private getGroupSummaryData(): {
    name: string;
    code: string;
    total: number;
    percentage: number;
  }[] {
    const groupConfig = [
      { code: 'Cu', name: 'Bakar (Cu)' },
      { code: 'Fe', name: 'Magnetna plocevina (Fe)' },
      { code: 'Fei', name: 'Celik (Fei)' },
      { code: 'Pap', name: 'Papir (Pap)' },
      { code: 'Oil', name: 'Ulje (Oil)' },
      { code: 'h', name: 'Rad (Delo)' },
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

    // Extract Broj ponude: P26-CODE+SUFFIX format (e.g. P26-0015.1.1)
    const offerMatch = text.match(/Broj ponude:\s*P\d{2}-(\d+)(\.[\d.]+)/);
    const offerCode = offerMatch?.[1] ?? '';
    const offerSuffix = offerMatch?.[2] ?? '.1.1';

    // Extract Broj tehnike: T26-CODE+SUFFIX format (e.g. T26-0015.0)
    const techMatch = text.match(/Broj tehnike:\s*T\d{2}-(\d+)(\.[\d.]+)/);
    const technicalCode = techMatch?.[1] ?? '';
    const technicalSuffix = techMatch?.[2] ?? '.0';

    const customerName = extractPdfField(text, 'Kupac', ['Broj komada:', 'Tip Transformatora:']);

    const komadaMatch = text.match(/Broj komada:\s*(\d+)/);
    const numberOfCommands = komadaMatch ? parseInt(komadaMatch[1]) : null;

    const transformerType = extractPdfField(text, 'Tip Transformatora', ['Komercijalista:']);
    const salespersonName = extractPdfField(text, 'Komercijalista', ['Grupa', 'Poz.']);

    this.formData = {
      offerCode,
      offerSuffix,
      technicalCode,
      technicalSuffix,
      customerName,
      numberOfCommands,
      transformerType,
      salespersonName,
    };

    const energyMatch = text.match(/Ukupna cena \+\s*([\d.,]+)%\s*energetski dodatak/);
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
      .replace(/Poz\.?\s*Naziv\s*Cena\s*Kolicina\s*JM\s*Ukupna cena\s*\([^)]*\)(\s*Grupa)?/gi, ' ')
      .replace(/UKUPNO:?\s*[\d,.]+/gi, ' ');

    // Try new format first (with Grupa column at the end)
    // Row format: "1 MaterialName 7.00 12.800 kg 89,600.00 Fe"
    const newFormatRegex = new RegExp(
      `(\\d+)\\s+(.+?)\\s+([\\d,]+\\.\\d{2})\\s+([\\d.,]+)\\s+(\\S+)\\s+([\\d,]+\\.\\d{2})\\s+(${GROUP_PATTERN})(?=\\s|$)`,
      'g'
    );

    let match;
    while ((match = newFormatRegex.exec(tableText)) !== null) {
      const name = match[2].trim();
      const price = parseFloat(match[3].replace(/,/g, ''));
      const quantity = parseFloat(match[4].replace(/[.,]/g, ''));
      const unit = match[5];
      const group = match[7];

      if (name && !isNaN(price) && !isNaN(quantity)) {
        const info = this.findMaterialInfo(name);
        materials.push({ name, price, quantity, unit, group, title: info.title });
      }
    }

    if (materials.length > 0) return materials;

    // Fallback: legacy format without Grupa column (handles dot/comma-formatted quantities)
    // Row format: "1 MaterialName 7.00 12,800 kg 89600.00"
    const legacyRegex = /(\d+)\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d.,]+)\s+(\S+)\s+([\d,]+\.\d{2})/g;

    while ((match = legacyRegex.exec(tableText)) !== null) {
      const name = match[2].trim();
      const price = parseFloat(match[3].replace(/,/g, ''));
      const quantity = parseFloat(match[4].replace(/[.,]/g, ''));
      const unit = match[5];

      if (name && !isNaN(price) && !isNaN(quantity)) {
        const info = this.findMaterialInfo(name);
        materials.push({ name, price, quantity, unit, group: info.group, title: info.title });
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
