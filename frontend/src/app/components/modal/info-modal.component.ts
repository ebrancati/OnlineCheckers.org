import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-info-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="show" class="modal fade show d-block" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h4 i18n="@@INFO_MODAL.OFFLINE_MODE_TITLE" class="modal-title">
              <i class="bi bi-house me-3"></i>
              Local Game
            </h4>
            <button 
              type="button" 
              class="btn-close" 
              (click)="onCloseX()" 
              aria-label="Close">
            </button>
          </div>
          <div class="modal-body">
            <p i18n="@@INFO_MODAL.OFFLINE_MODE_PARAGRAPH_1">Play on the same device with someone next to you, without needing internet.</p>
            <p i18n="@@INFO_MODAL.OFFLINE_MODE_PARAGRAPH_2">White pieces start first, then players alternate turns.</p>
            <p i18n="@@INFO_MODAL.OFFLINE_MODE_PARAGRAPH_3">Click on your pieces to see available moves, then click where you want to move.</p>
          </div>
          <div class="modal-footer">
            <button 
              type="button" 
              class="btn btn-primary" 
              (click)="onCloseGotIt()">
                Got it!
              </button>
          </div>
        </div>
      </div>
    </div>
    <div *ngIf="show" class="modal-backdrop fade show"></div>
  `
})
export class InfoModalComponent {
  @Input() show: boolean = false;
  @Output() closeX = new EventEmitter<void>();
  @Output() closeGotIt = new EventEmitter<void>();

  onCloseX(): void {
    this.closeX.emit();
  }

  onCloseGotIt(): void {
    this.closeGotIt.emit();
  }
}