import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { MaterialsComponent, MaterialOption } from './components/materials/materials';
import { MaterialOfferComponent } from './components/material-offer/material-offer';
import { FixedMaterialOfferComponent } from './components/material-offer/fixed-material-offer/fixed-material-offer';
import { MaterialSummaryComponent } from './components/offer-form/material-summary/material-summary';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  imports: [ButtonModule, TabsModule, MaterialsComponent, MaterialOfferComponent, FixedMaterialOfferComponent, MaterialSummaryComponent],
})
export class AppComponent {
  selectedOptions: MaterialOption[] = [];
  optionsVersion = 0;

  onOptionSelected(option: MaterialOption) {
    this.selectedOptions = [...this.selectedOptions, { ...option }];
  }

  onQuantityChanged(event: { index: number; quantity: number }) {
    this.selectedOptions[event.index].quantity = event.quantity;
    this.optionsVersion++;
  }

  onPriceChanged(event: { index: number; price: number }) {
    this.selectedOptions[event.index].price = event.price;
    this.optionsVersion++;
  }

  onNameChanged(event: { index: number; name: string }) {
    this.selectedOptions[event.index].name = event.name;
    this.optionsVersion++;
  }

  onUnitChanged(event: { index: number; unit: string }) {
    this.selectedOptions[event.index].unit = event.unit;
    this.optionsVersion++;
  }

  onOptionRemoved(index: number) {
    this.selectedOptions = this.selectedOptions.filter((_, i) => i !== index);
  }

  onMaterialsImported(materials: MaterialOption[]) {
    this.selectedOptions = materials;
  }
}
