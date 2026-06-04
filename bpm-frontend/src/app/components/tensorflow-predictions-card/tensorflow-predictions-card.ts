import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tensorflow-predictions-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tensorflow-predictions-card.html',
  styleUrls: ['./tensorflow-predictions-card.css']
})
export class TensorflowPredictionsCard {
  @Input() rutaSugerida: string = 'Evaluación Técnica';
  @Input() tiempoEstimadoMinutos: number = 45;
  @Input() prioridadRecomendada: string = 'ALTA';
  @Input() isAnomalo: boolean = false;
  @Input() scoreEficiencia: number = 0.92;
}
