import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';

export interface OfferFormData {
  offerCode: string;
  offerSuffix: string;
  customerName: string;
  transformerType: string;
  salespersonName: string;
  technicalCode: string;
  technicalSuffix: string;
  numberOfCommands: number | null;
}

@Component({
  selector: 'app-offer-form',
  templateUrl: './offer-form.html',
  imports: [FormsModule, InputTextModule, InputNumberModule, InputGroupModule, InputGroupAddonModule],
})
export class OfferFormComponent {
  formData = model<OfferFormData>({
    offerCode: '',
    offerSuffix: '.1.1',
    customerName: '',
    transformerType: '',
    salespersonName: '',
    technicalCode: '',
    technicalSuffix: '.0',
    numberOfCommands: null,
  });

  get yearSuffix(): string {
    return new Date().getFullYear().toString().slice(-2);
  }

  updateField<K extends keyof OfferFormData>(field: K, value: OfferFormData[K]) {
    this.formData.update((data) => ({ ...data, [field]: value }));
  }
}
