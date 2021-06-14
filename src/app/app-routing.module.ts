import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import { FomulaComponent } from './fomula/fomula.component';


const routes: Routes = [
  {
    path: 'fomula',
    component: FomulaComponent
  },
  {
    path: '**',
    redirectTo: '/fomula',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
