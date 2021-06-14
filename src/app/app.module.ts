import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  PerfectScrollbarModule,
  PERFECT_SCROLLBAR_CONFIG,
  PerfectScrollbarConfigInterface
} from 'ngx-perfect-scrollbar';

const DEFAULT_PERFECT_SCROLLBAR_CONFIG:
  PerfectScrollbarConfigInterface = {
  wheelPropagation: true
};

import { AppComponent } from './app.component';
import { FomulaComponent } from './fomula/fomula.component';
import { RightPanelComponent } from './fomula/right-panel/right-panel.component';
import { ConfirmComponent } from './fomula/modals/confirm/confirm.component';

import { AppRoutingModule } from './app-routing.module';


import { DataListService } from '../services/data-list.service';

@NgModule({
  declarations: [
    AppComponent,
    FomulaComponent,
    RightPanelComponent,
    ConfirmComponent
  ],
  imports: [
    BrowserModule,
    PerfectScrollbarModule,
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    HttpClientModule
  ],
  providers: [{
    provide: PERFECT_SCROLLBAR_CONFIG,
    useValue: DEFAULT_PERFECT_SCROLLBAR_CONFIG
  }, DataListService],
  bootstrap: [AppComponent]
})
export class AppModule { }
