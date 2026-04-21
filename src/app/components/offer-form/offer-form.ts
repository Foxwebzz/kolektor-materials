import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputGroupModule } from 'primeng/inputgroup';

export interface OfferFormData {
  offerPrefix: string;
  offerCode: string;
  offerSuffix: string;
  customerName: string;
  transformerType: string;
  salespersonName: string;
  country: string;
  technicalPrefix: string;
  technicalCode: string;
  technicalSuffix: string;
  numberOfCommands: number | null;
}

export function createDefaultOfferFormData(): OfferFormData {
  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  return {
    offerPrefix: `P${yearSuffix}-`,
    offerCode: '',
    offerSuffix: '.1.1',
    customerName: '',
    transformerType: '',
    salespersonName: '',
    country: '',
    technicalPrefix: `T${yearSuffix}-`,
    technicalCode: '',
    technicalSuffix: '.0',
    numberOfCommands: null,
  };
}

@Component({
  selector: 'app-offer-form',
  templateUrl: './offer-form.html',
  imports: [FormsModule, InputTextModule, InputNumberModule, InputGroupModule],
})
export class OfferFormComponent {
  formData = model<OfferFormData>(createDefaultOfferFormData());

  updateField<K extends keyof OfferFormData>(field: K, value: OfferFormData[K]) {
    this.formData.update((data) => ({ ...data, [field]: value }));
  }
}
