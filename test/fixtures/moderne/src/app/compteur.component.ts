import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal, viewChild, ElementRef } from '@angular/core';
import { Service } from './service';

@Component({
  selector: 'app-compteur',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (v of valeurs(); track v) { <span>{{ v }}</span> }
    @if (total() > 0) { <b>{{ total() }}</b> }
    @defer (on viewport) { <p>plus tard</p> }
  `,
})
export class CompteurComponent {
  readonly depart = input.required<number>();
  readonly change = output<number>();
  readonly zone = viewChild<ElementRef>('zone');
  private readonly service = inject(Service);
  readonly valeurs = signal<number[]>([]);
  readonly total = computed(() => this.valeurs().reduce((a, b) => a + b, 0) + this.depart());
}
