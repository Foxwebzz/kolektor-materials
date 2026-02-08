import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { MaterialOption } from '../../materials/models/material.model';

export interface GroupSummary {
  name: string;
  code: string;
  total: number;
  percentage: number;
}

@Component({
  selector: 'app-material-summary',
  templateUrl: './material-summary.html',
  imports: [TableModule, DecimalPipe],
})
export class MaterialSummaryComponent {
  selectedOptions = input<MaterialOption[]>([]);

  private readonly groupConfig: { code: string; name: string }[] = [
    { code: 'Cu', name: 'Bakar (Cu)' },
    { code: 'Fe', name: 'Magnetna plocevina (Fe)' },
    { code: 'Fei', name: 'Celik (Fei)' },
    { code: 'Pap', name: 'Papir (Pap)' },
    { code: 'Oil', name: 'Ulje (Oil)' },
    { code: 'h', name: 'Rad' },
    { code: 'n', name: 'Drugi materijali (n)' },
  ];

  groupSummaries = computed<GroupSummary[]>(() => {
    const options = this.selectedOptions();
    const grandTotal = options.reduce((sum, opt) => sum + opt.price * opt.quantity, 0);

    return this.groupConfig.map((group) => {
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
  });
}
