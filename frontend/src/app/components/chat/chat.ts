import { Component, Input, Output, EventEmitter, OnChanges, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebSocketService } from '../../../services/websocket-service';

@Component({
  selector: 'app-chat',
  imports: [ CommonModule, FormsModule ],
  templateUrl: './chat.html',
  styleUrl:    './chat.css'
})
export class ChatComponent implements OnChanges {
  @Input() gameId!: string;
  @Input() chatHistory: string = '';
  @Input() nickname!: string | null;
  @Input() isSpectator: boolean = false;
  @Input() whitePlayerNickname: string = '';
  @Input() blackPlayerNickname: string = '';
  @Output() messageAdded = new EventEmitter<string>();

  private optimisticMessages: Set<string> = new Set();
  messageInput: string = '';
  
  constructor(
    private webSocketService: WebSocketService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnChanges(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.chatHistory) this.removeDuplicateOptimisticMessages();

    const chatMessagesDiv = document.querySelector('.chat-messages') as HTMLElement;
    const delay = (chatMessagesDiv?.scrollHeight || 0) < 50 ? 250 : 0;

    setTimeout(() => {
      if (chatMessagesDiv) chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    }, delay);
  }

  /**
   * Check if both players have joined the game
   */
  private hasOpponentJoined(): boolean {
    return this.whitePlayerNickname !== 'Awaiting opponent...' && 
           this.blackPlayerNickname !== 'Awaiting opponent...' &&
           this.whitePlayerNickname.trim() !== '' &&
           this.blackPlayerNickname.trim() !== '';
  }

  /**
   * Check if the current user can send messages
   */
  canSendMessage(): boolean {
    // Spectators cannot send messages
    if (this.isSpectator) return false;
    
    // Players can only send messages if opponent has joined
    return this.hasOpponentJoined();
  }

  sendMessage(): void {
    const text = this.messageInput.trim();
    if (!text) return;

    if (this.isSpectator) {
      alert('Spectators cannot send chat messages');
      return;
    }

    if (!this.hasOpponentJoined()) {
      alert('You cannot send messages until your opponent joins the game');
      return;
    }

    if (this.gameId === 'offline') {
      // Handle offline mode
      const formattedMessage = `<strong>${this.nickname}</strong>: ${text}`;
      this.messageAdded.emit(formattedMessage);
      this.messageInput = '';
    }
    else {
      // Handle online mode via WebSocket
      if (this.nickname && this.webSocketService.isConnected()) {
        const optimisticMessage = `<strong>${this.nickname}</strong>: ${text}`;

        this.chatHistory += (this.chatHistory ? '\n' : '') + optimisticMessage;
        this.optimisticMessages.add(optimisticMessage);
        
        // Send to server
        this.webSocketService.sendChatMessage(this.gameId, this.nickname, text);
        this.messageInput = '';
      }
      else {
        console.error('Cannot send message: not connected or no nickname');
      }
    }
  }

  
  private removeDuplicateOptimisticMessages(): void {
    this.optimisticMessages.forEach(optMsg => {
      if (this.chatHistory.includes(optMsg)) this.optimisticMessages.delete(optMsg);
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const button = document.querySelector('.chat-input button') as HTMLElement;
      if (button && this.canSendMessage()) {
        button.classList.add('send-animation');
        setTimeout(() => button.classList.remove('send-animation'), 200);
      }
      this.sendMessage();
    }
  }
}