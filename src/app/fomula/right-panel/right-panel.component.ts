import {
  Component, ElementRef, Input, Output, OnInit,
  OnChanges, EventEmitter
} from '@angular/core';
import { DataListService } from '../../../services/data-list.service';

@Component({
  selector: 'app-right-panel',
  templateUrl: './right-panel.component.html',
  styleUrls: ['./right-panel.component.scss']
})

export class RightPanelComponent implements OnInit, OnChanges {
  @Input() panelData = {};
  masterData = {};
  @Output() changePanelData = new EventEmitter();
  @Output() deletePanelData = new EventEmitter();
  deleteShow = false;
  errorMessage: any;
  constructor(
    public dataListService: DataListService) {
  }

  ngOnInit() {
    this.getDataList();
  }

  ngOnChanges() {
    this.deleteShow = false;
  }

  // label visibility
  getVisibility(name) {
    return this.panelData[name] !== '' ? 'visible' : 'hidden';
  }

  //  Handle the dataListService observable
  getDataList(): void {
    this.dataListService.get('assets/data/GetPolicyMasterData.json')
      .subscribe(
        dataList => this.masterData = dataList,
        error => this.errorMessage = error
      );
  }

}
