import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../../../services/websocket.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl:    './chat.component.css'
})
export class ChatComponent {
  @Input() gameId!: string;
  @Input() chatHistory: string = '';
  @Input() nickname!: string | null;
  @Input() isSpectator: boolean = false;
  @Output() messageAdded = new EventEmitter<string>();

  messageInput: string = '';
  
  constructor(private webSocketService: WebSocketService) {}

  sendMessage(): void {
    const text = this.messageInput.trim();
    if (!text) return;

    if (this.isSpectator) {
      console.log('Spectators cannot send chat messages');
      alert('Spectators cannot send chat messages');
      return;
    }

    if (this.gameId === 'offline') {
      // Handle offline mode (unchanged)
      const formattedMessage = `<strong>${this.nickname}</strong>: ${text}`;
      this.messageAdded.emit(formattedMessage);
      this.messageInput = '';
    } else {
      // Handle online mode via WebSocket
      if (this.nickname && this.webSocketService.isConnected()) {
        this.webSocketService.sendChatMessage(this.gameId, this.nickname, text);
        this.messageInput = '';
      } else {
        console.error('Cannot send message: not connected or no nickname');
      }
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.sendMessage();
    }
  }
}