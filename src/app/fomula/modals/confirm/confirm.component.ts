import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';


import * as _ from 'lodash';
@Component({
    selector: 'app-confirm',
    templateUrl: './confirm.component.html',
    styleUrls: ['./confirm.component.scss']
})

export class ConfirmComponent implements OnInit {
    @Input() data = {};
    @Input() title = '';
    constructor(
        public activeModal: NgbActiveModal) {
    }

    ngOnInit() {
    }

    // delete
    onDelete() {
        this.activeModal.close({ type: 'delete', data: this.data });
    }

    // reset
    onReset() {
        this.activeModal.close({ type: 'reset', data: this.data });
    }


}
