import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Material, MaterialOption } from '../materials/materials';

@Component({
  selector: 'app-material-options',
  templateUrl: './material-options.html',
  imports: [ButtonModule],
})
export class MaterialOptionsComponent {
  selectedMaterial = input<Material | null>(null);
  optionSelected = output<MaterialOption>();

  onOptionClick(option: MaterialOption) {
    this.optionSelected.emit(option);
  }
}
