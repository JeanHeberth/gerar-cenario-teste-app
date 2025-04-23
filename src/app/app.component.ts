import { Component } from '@angular/core';
import {CenarioComponent} from './cenario/cenario.component';
import {RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'gerar-cenario-teste-app';
}
