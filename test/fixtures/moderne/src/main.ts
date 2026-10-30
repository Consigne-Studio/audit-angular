import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { CompteurComponent } from './app/compteur.component';
bootstrapApplication(CompteurComponent, { providers: [provideZonelessChangeDetection()] });
