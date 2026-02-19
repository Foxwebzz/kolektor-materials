import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { MaterialsService } from '../../services/materials.service';
import { Material, MaterialOption } from '../materials/models/material.model';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.html',
  imports: [
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
})
export class AdminComponent implements OnInit {
  @ViewChild('dt') table!: Table;
  private materialsService = inject(MaterialsService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

  materials: Material[] = [];
  loading = true;

  // Category dialog
  categoryDialogVisible = false;
  editingCategory: Material | null = null;
  categoryForm = { title: '', order: 0 };

  // Option dialog
  optionDialogVisible = false;
  editingOption: MaterialOption | null = null;
  editingOptionMaterial: Material | null = null;
  optionForm = { name: '', price: 0, unit: '', group: '' };

  groupOptions = ['Cu', 'Fe', 'Fei', 'Pap', 'Oil', 'h', 'n'];

  ngOnInit() {
    this.loadMaterials();
  }

  loadMaterials() {
    this.loading = true;
    this.materialsService.getMaterials().subscribe((data) => {
      this.materials = data;
      this.loading = false;
    });
  }

  goBack() {
    this.router.navigate(['/']);
  }

  toggleRow(material: Material, event: Event) {
    this.table.toggleRow(material, event);
  }

  isExpanded(material: Material): boolean {
    return this.table?.expandedRowKeys?.[material._id!] === true;
  }

  // --- Category CRUD ---

  openCategoryDialog(category?: Material) {
    if (category) {
      this.editingCategory = category;
      this.categoryForm = { title: category.title, order: category.order ?? 0 };
    } else {
      this.editingCategory = null;
      this.categoryForm = { title: '', order: 0 };
    }
    this.categoryDialogVisible = true;
  }

  saveCategory() {
    if (!this.categoryForm.title.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Upozorenje', detail: 'Naziv je obavezan' });
      return;
    }

    if (this.editingCategory) {
      this.materialsService.updateMaterial(this.editingCategory._id!, this.categoryForm).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Uspeh', detail: 'Kategorija izmenjena' });
          this.categoryDialogVisible = false;
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Greška', detail: 'Izmena nije uspela' });
        },
      });
    } else {
      this.materialsService.createMaterial(this.categoryForm).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Uspeh', detail: 'Kategorija kreirana' });
          this.categoryDialogVisible = false;
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Greška', detail: 'Kreiranje nije uspelo' });
        },
      });
    }
  }

  confirmDeleteCategory(material: Material) {
    this.confirmationService.confirm({
      message: `Da li ste sigurni da želite da obrišete "${material.title}"?`,
      header: 'Potvrda brisanja',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Da',
      rejectLabel: 'Ne',
      accept: () => {
        this.materialsService.deleteMaterial(material._id!).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Uspeh', detail: 'Kategorija obrisana' });
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Greška', detail: 'Brisanje nije uspelo' });
          },
        });
      },
    });
  }

  // --- Option CRUD ---

  openOptionDialog(material: Material, option?: MaterialOption) {
    this.editingOptionMaterial = material;
    if (option) {
      this.editingOption = option;
      this.optionForm = { name: option.name, price: option.price, unit: option.unit, group: option.group };
    } else {
      this.editingOption = null;
      this.optionForm = { name: '', price: 0, unit: '', group: '' };
    }
    this.optionDialogVisible = true;
  }

  saveOption() {
    if (!this.optionForm.name.trim() || !this.optionForm.unit.trim() || !this.optionForm.group) {
      this.messageService.add({ severity: 'warn', summary: 'Upozorenje', detail: 'Sva polja su obavezna' });
      return;
    }

    const materialId = this.editingOptionMaterial!._id!;

    if (this.editingOption) {
      this.materialsService.updateOption(materialId, this.editingOption._id!, this.optionForm).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Uspeh', detail: 'Opcija izmenjena' });
          this.optionDialogVisible = false;
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Greška', detail: 'Izmena nije uspela' });
        },
      });
    } else {
      this.materialsService.addOption(materialId, { ...this.optionForm, quantity: 1 }).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Uspeh', detail: 'Opcija dodana' });
          this.optionDialogVisible = false;
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Greška', detail: 'Dodavanje nije uspelo' });
        },
      });
    }
  }

  confirmDeleteOption(material: Material, option: MaterialOption) {
    this.confirmationService.confirm({
      message: `Da li ste sigurni da želite da obrišete "${option.name}"?`,
      header: 'Potvrda brisanja',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Da',
      rejectLabel: 'Ne',
      accept: () => {
        this.materialsService.deleteOption(material._id!, option._id!).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Uspeh', detail: 'Opcija obrisana' });
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Greška', detail: 'Brisanje nije uspelo' });
          },
        });
      },
    });
  }
}
