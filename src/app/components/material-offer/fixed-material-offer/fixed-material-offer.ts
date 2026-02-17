import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { MaterialOption } from '../../materials/materials';

interface FixedGroupConfig {
  name: string;
  titles: string[];
  startPos: number;
  endPos: number;
}

export interface FixedTableRow {
  type: 'header' | 'data';
  groupName?: string;
  position?: number;
  name: string;
  price: number | null;
  quantity: number | null;
  unit: string;
  group: string;
  total: number | null;
}

export const FIXED_GROUPS: FixedGroupConfig[] = [
  {
    name: 'Magnetno jezgro',
    titles: ['Magnetno Jezgro'],
    startPos: 1,
    endPos: 2,
  },
  { name: 'Namotaji', titles: ['Namotaji'], startPos: 3, endPos: 7 },
  { name: 'Izolacija', titles: ['Izolacija'], startPos: 8, endPos: 12 },
  { name: 'Regulacija', titles: ['Regulacija'], startPos: 13, endPos: 14 },
  { name: 'Ulje', titles: ['Ulje'], startPos: 15, endPos: 15 },
  { name: 'Trafo Sud', titles: ['Trafo Sud'], startPos: 16, endPos: 18 },
  { name: 'Hladjenje', titles: ['Hladjenje'], startPos: 19, endPos: 23 },
  { name: 'Izolatori', titles: ['Izolatori'], startPos: 24, endPos: 27 },
  { name: 'Oprema', titles: ['Oprema'], startPos: 28, endPos: 39 },
  { name: 'Dodatni zahtevi', titles: ['Dodatni zahtevi'], startPos: 40, endPos: 55 },
  { name: 'Transport', titles: ['Transport'], startPos: 56, endPos: 57 },
  { name: 'Rad', titles: ['Rad'], startPos: 58, endPos: 60 },
];

@Component({
  selector: 'app-fixed-material-offer',
  templateUrl: './fixed-material-offer.html',
  imports: [TableModule, DecimalPipe],
})
export class FixedMaterialOfferComponent {
  selectedOptions = input<MaterialOption[]>([]);
  version = input(0);

  tableRows = computed(() => {
    this.version();
    const options = this.selectedOptions();
    const rows: FixedTableRow[] = [];

    for (const group of FIXED_GROUPS) {
      rows.push({
        type: 'header',
        groupName: group.name,
        name: '',
        price: null,
        quantity: null,
        unit: '',
        group: '',
        total: null,
      });

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
          rows.push({
            type: 'data',
            position: pos,
            name: opt.name,
            price: opt.price,
            quantity: opt.quantity,
            unit: opt.unit,
            group: opt.group,
            total: opt.price * opt.quantity,
          });
        } else {
          rows.push({
            type: 'data',
            position: pos,
            name: '',
            price: null,
            quantity: null,
            unit: '',
            group: '',
            total: null,
          });
        }
      }
    }

    return rows;
  });

  total = computed(() => {
    this.version();
    return this.selectedOptions().reduce((sum, opt) => sum + opt.price * opt.quantity, 0);
  });

  energyPercent = input(5);
  transformerMass = input<number | null>(null);
  totalWithEnergy = input(0);
}
