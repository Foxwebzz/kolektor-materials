import { Component, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Material, MaterialOption } from './models/material.model';
import { MATERIALS } from './data/materials.data';
import { enterLeaveHeightAnimation } from '../../../animations/enter-leave-height.animation';

export type { Material, MaterialOption } from './models/material.model';
export { MATERIALS } from './data/materials.data';

@Component({
  selector: 'app-materials',
  templateUrl: './materials.html',
  imports: [ButtonModule, InputTextModule, FormsModule],
  animations: [enterLeaveHeightAnimation],
})
export class MaterialsComponent {
  optionSelected = output<MaterialOption>();
  materials = MATERIALS;
  expandedMaterial: Material | null = null;
  searchTerm = '';

  onMaterialClick(material: Material) {
    this.expandedMaterial = this.expandedMaterial === material ? null : material;
    this.searchTerm = '';
  }

  onOptionClick(material: Material, option: MaterialOption) {
    this.optionSelected.emit({ ...option, title: material.title });
  }

  getFilteredOptions(options: MaterialOption[]): MaterialOption[] {
    if (!this.searchTerm) {
      return options;
    }
    const term = this.searchTerm.toLowerCase();
    return options.filter(option => option.name.toLowerCase().includes(term));
  }
}
