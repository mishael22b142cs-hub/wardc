import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HealthService } from '../../../services/health.service';
import { ToastService } from '../../../services/toast.service';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-health-record-vault',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="p-8 max-w-4xl mx-auto">
      <div class="text-center mb-12">
        <div class="w-20 h-20 mx-auto mb-4 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500">
          <mat-icon style="font-size: 40px; width: 40px; height: 40px;">enhanced_encryption</mat-icon>
        </div>
        <h1 class="text-3xl font-bold mb-2">Health Vault</h1>
        <p class="text-gray-500">End-to-end encrypted storage for your sensitive medical records.</p>
      </div>

      <div class="bg-transparent border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center mb-8 hover:bg-gray-50 transition-colors cursor-pointer group"
           (click)="fileInput.click()">
        <input #fileInput type="file" (change)="onFileSelected($event)" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" hidden>
        <p class="mb-4 text-gray-500 group-hover:text-gray-600">Drag and drop files here, or click to upload</p>
        <button class="bg-gradient-to-r from-sky-500 to-indigo-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 mx-auto disabled:opacity-50 disabled:hover:translate-y-0"
                [disabled]="isUploading"
                (click)="$event.stopPropagation(); fileInput.click()">
          <mat-icon [class.animate-spin]="isUploading">{{ isUploading ? 'sync' : 'upload_file' }}</mat-icon> 
          {{ isUploading ? 'Securing Document...' : 'Upload New Record' }}
        </button>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 class="font-bold text-lg text-gray-800">Stored Records ({{records.length}})</h3>
        </div>

        <div class="divide-y divide-gray-100">
          <div *ngIf="records.length === 0" class="p-8 text-center text-gray-400">
             No medical records uploaded yet.
          </div>
          <div *ngFor="let rec of records" class="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
            <div class="flex items-center gap-4">
              <div class="p-3 bg-white rounded-lg border border-gray-200">
                <mat-icon class="text-indigo-500">description</mat-icon>
              </div>
              
              <div>
                <div class="font-bold text-gray-800 font-mono text-base truncate max-w-sm" [title]="rec.title">
                  {{rec.title || 'Medical Document'}}
                </div>
                <div class="text-sm text-gray-500 flex items-center gap-2 mt-1">
                  <span>{{rec.recordDate}}</span>
                  <span>•</span>
                  <span class="text-xs bg-gray-100 px-2 py-0.5 rounded uppercase font-semibold tracking-wide">
                    {{rec.category}}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <a *ngIf="rec.fileUrl" [href]="baseUrl + rec.fileUrl" target="_blank" 
                 class="p-2 rounded-full hover:bg-indigo-50 text-indigo-500 transition-colors cursor-pointer flex items-center justify-center"
                 title="Download File">
                <mat-icon>download</mat-icon>
              </a>
              <button (click)="deleteRecord(rec.id)" [disabled]="isDeleting === rec.id"
                      class="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50"
                      title="Delete Record">
                <mat-icon>{{ isDeleting === rec.id ? 'sync' : 'delete' }}</mat-icon>
              </button>
            </div>
          </div>
        </div>
        
        <div class="p-4 bg-emerald-50 text-emerald-600 text-sm flex items-center gap-2 border-t border-emerald-100 font-medium">
           <mat-icon class="text-sm w-4 h-4 flex items-center text-emerald-500">verified_user</mat-icon> Your records are securely stored and rapidly accessible anytime.
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --primary: #0ea5e9;
      --secondary: #6366f1;
    }
  `]
})
export class HealthRecordVaultComponent implements OnInit {
  healthService = inject(HealthService);
  toast = inject(ToastService);

  records: any[] = [];
  baseUrl = environment.apiUrl;
  isUploading = false;
  isDeleting: string | null = null;

  ngOnInit() {
    this.loadRecords();
  }

  loadRecords() {
    this.healthService.getHealthRecords().subscribe({
      next: (res) => { this.records = res; },
      error: (err) => { this.toast.showError('Failed to load health records'); }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isUploading = true;
      const formData = new FormData();
      formData.append('file', file);
      
      this.healthService.addHealthRecord(formData).subscribe({
        next: () => {
          this.toast.showSuccess('File officially locked into Health Vault!');
          this.loadRecords();
          this.isUploading = false;
        },
        error: () => {
          this.toast.showError('File upload failed.');
          this.isUploading = false;
        }
      });
    }
  }

  deleteRecord(id: string) {
    if (confirm('Are you sure you want to permanently delete this medical record?')) {
      this.isDeleting = id;
      this.healthService.deleteHealthRecord(id).subscribe({
        next: () => {
          this.toast.showSuccess('Medical record securely deleted.');
          this.loadRecords();
          this.isDeleting = null;
        },
        error: () => {
          this.toast.showError('Failed to delete the record.');
          this.isDeleting = null;
        }
      });
    }
  }
}
