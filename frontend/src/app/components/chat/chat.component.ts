import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GameService } from '../../../services/game.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent {
  @Input() gameId!: string;
  @Input() chatHistory: string = '';
  @Output() messageAdded = new EventEmitter<string>();

  messageInput: string = '';
  @Input() nickname!: string | null;

  constructor(private gameService: GameService) {}

  sendMessage(): void {
    const text = this.messageInput.trim();
    if (!text) return;

    const payload = { player: this.nickname, text };

    if (this.gameId === 'offline') {
      // Handle offline mode
      const formattedMessage = `<strong>${this.nickname}</strong>: ${text}`;
      this.messageAdded.emit(formattedMessage);
      this.messageInput = '';
    }
    else {
      // Handle online mode
      this.gameService.sendMessages(this.gameId, payload).subscribe({
        next: () => {
          this.messageInput = '';
        },
        error: err => console.error('Error sending message', err)
      });
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.sendMessage();
    }
  }
}