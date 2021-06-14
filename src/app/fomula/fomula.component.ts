import {
  Component, EventEmitter, Input, OnInit, Output, ViewChild,
  ElementRef, HostListener, AfterViewInit
} from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { saveAs as importedSaveAs } from 'file-saver';
import { NgbModal, NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmComponent } from './modals/confirm/confirm.component';
import * as _ from 'lodash';
import * as moment from 'moment';
import * as d3 from 'd3';
import {
  PerfectScrollbarConfigInterface
} from 'ngx-perfect-scrollbar';

@Component({
  selector: 'app-fomula',
  templateUrl: './fomula.component.html',
  styleUrls: ['./fomula.component.scss']
})
export class FomulaComponent implements OnInit {
  form: FormGroup;
  rationale: FormArray;
  @Input() data = {};
  @Input() masterData: any = {};
  submitted = false;

  treeData = {};
  idCurrent = 0;
  idStatement = 0;
  addFirstShow = true;

  public configScrollbar: PerfectScrollbarConfigInterface = {};


  @ViewChild('panel') panelElement: ElementRef;
  @ViewChild('formula') formulaElement: ElementRef;


  // tree
  margin = ({ top: 20, left: 20, right: 20, bottom: 20 });
  width = 1000;
  height = 1000;
  dx = 10;
  dy = this.width / 6;
  tree: any;
  formula = 'No statement added yet';
  formulas = [];
  selectedNode = null;
  leafCount = 0;
  widthTree = 0;


  // svg width
  widthBranch = 38;
  widthMarginBetweenNode = 8;
  widthDefaultStatement = 104;
  heightNodeLeaf = 30;
  heightMarginBetweenNode = 8;

  addDonePopup = false;
  donePopupContent = '';
  beFirst = false;



  panelData = {
    type: 'default',
    id: -1,
    statementId: -1,
    level: 0,
    logicalOperator: '',
    propertyCategory: '',
    propertySubcategory: '',
    property: '',
    relationalOperator: '',
    value: ''
  };

  constructor(
    private formBuilder: FormBuilder,
    config: NgbModalConfig,
    private modalService: NgbModal) {

    config.backdrop = 'static';

  }

  ngOnInit() {
    // edit panel params
  }

  ngAfterViewInit() {
    this.height = this.panelElement.nativeElement.offsetHeight;
    this.width = this.panelElement.nativeElement.offsetWidth;
    this.initTree();
  }
  /**
   * on Resize widows
   */
  @HostListener('window:resize', ['$event'])
  onResize(event) {
    // edit panel param
    this.height = this.panelElement.nativeElement.offsetHeight;
    this.width = this.panelElement.nativeElement.offsetWidth;
    this.chart();
  }



  @HostListener('document:click', ['$event'])
  onClick(event): void {
    // remove add panel when click other
    const imageDoms = document.getElementsByTagName('image');
    const fi = _.find(imageDoms, function (o) {
      return o.contains(event.target) ||
        String(o) === String(event.target);
    });
    if (document.getElementById('addPanel') &&
      !document.getElementById('addPanel').contains(event.target)
      && !fi) {
      d3.select('#addPanel').remove();

    }

    // click blank(not rect)
    const rectDoms = document.getElementsByTagName('rect');
    const f = _.find(rectDoms, function (o) {
      return o.contains(event.target) || String(o) === String(event.target);
    });

    const textDoms = document.getElementsByTagName('text');
    const ff = _.find(textDoms, function (o) {
      return o.contains(event.target) || String(o) === String(event.target);
    });


    const svgDoms = document.getElementsByTagName('svg');
    const fsvg = _.find(svgDoms, function (o) {
      return o.contains(event.target) || String(o) === String(event.target);
    });
    if (fsvg && !f && !ff && !fi && !this.beFirst && this.treeData &&
      !_.isEqual(this.treeData, {})) {

      this.selectedNode = null;
      this.treeData = this.preUnclickTree(this.treeData);
      this.getFormula();
      this.selectAndSetPanelData(null);
      this.chart();

    }
    if (this.beFirst) {
      this.beFirst = false;

    }
  }

  // pre order when click black area
  preUnclickTree(root) {
    if (root) {
      if (root.id === this.treeData['id']) {
        root.addPanelShow = false;
        root.selected = false;
        root.selectedSubTree = false;
      }

      if (root.children) {
        for (let i = 0; i < root.children.length; i++) {
          root.children[i].addPanelShow = false;
          root.children[i].selected = false;
          root.children[i].selectedSubTree = false;
          this.preUnclickTree(root.children[i]);
        }
      }
    }
    return root;
  }
  /**
   * add first
   */
  addFirst() {
    this.addFirstShow = false;
    this.setNewItem(this.treeData, 'leaf', true);
    this.selectedNode = { data: this.treeData };
    this.onSelectNode(this.selectedNode);
    this.getFormula();
    this.initTree();
    this.chart();
    this.beFirst = true;
  }
  /**
  * pre order for add this level
  */
  preAddThisLevel(root, selectedNodeId) {
    if (!root) {
      return;
    }

    if (root.id === this.treeData['id']
      && root.id === selectedNodeId) {
      // add node
      const sibling = {};
      const parent = {};
      this.setNewItem(parent, 'branch', false);
      this.setNewItem(sibling, 'leaf', false);
      root['addPanelShow'] = false;


      if (root.type === 'leaf') {
        parent['children'].push(root);
        parent['children'].push(sibling);
        root = _.clone(parent);
      } else {
        root['children'].push(sibling);
      }

      this.selectedNode = { data: sibling };
      return root;
    }

    if (root['children']) {
      for (let i = 0; i < root['children'].length; i++) {
        // add node
        const self = root['children'][i];
        if (self.id === selectedNodeId) {
            const sibling = {};
            this.setNewItem(sibling, 'leaf', true);
            self['addPanelShow'] = false;
          if (self.type === 'leaf') {
            root['children'].push(sibling);
          } else {
            self['children'].push(sibling);
          }
          this.selectedNode = { data: sibling };
          i++;
          
        } 
        this.preAddThisLevel(root['children'][i], selectedNodeId);
      }
    }
    return root;
  }

  /**
   * add this level
   * @param d :current node
   */
  addThisLevel(selectedNodeId) {
    this.selectedNode = null;
    this.treeData = this.preAddThisLevel(this.treeData, selectedNodeId);
    this.onSelectNode(this.selectedNode);
    this.chart();
    this.getFormula();
  }

  preAddNestedLevel(root, selectedNodeId) {
    let result = root;
    if (!root) {
      return root;
    }

    // root node
    if (root.id === this.treeData['id']) {
      // add node
      if (root.id === selectedNodeId) {
        const spouse = {};
        const parent = {};
        this.setNewItem(parent, 'branch', true);
        this.setNewItem(spouse, 'leaf', false);
        
        root['addPanelShow'] = false;
        
        parent['children'].push(root);
        parent['children'].push(spouse);
        result = parent;

        this.selectedNode = { data: spouse };
        return result;
      }
    }

    if (root['children']) {
      for (let i = 0; i < root['children'].length; i++) {
        const self = _.clone(root['children'][i]);
        if (self.id === selectedNodeId) {
          const spouse = {};
          const parent = {};
          this.setNewItem(parent, 'branch', true);
          this.setNewItem(spouse, 'leaf', false);
          
          self['addPanelShow'] = false;
          parent['addPanelShow'] = false;

          parent['children'].push(self);
          parent['children'].push(spouse);
          root['children'][i] = parent;
          this.selectedNode = { data: spouse };
          console.log(this.selectedNode);
          return result;

        }
        this.preAddNestedLevel(root['children'][i], selectedNodeId);
      }
    }
    return result;
  }
  /**
   * add nested level
   * @param d :current node
   */
  addNestedLevel(selectedNodeId) {
    this.selectedNode = null;
    this.treeData = this.preAddNestedLevel(this.treeData, selectedNodeId);
    this.onSelectNode(this.selectedNode);
    this.chart();
    this.getFormula();
  }


  preNestingLevel(root, selectedNodeId) {
    if (!root) {
      return root;
    } else if (root.id === this.treeData['id']
      && root.id === selectedNodeId) {
      return root;
    }
    if (root['children']) {
      for (let i = 0; i < root['children'].length; i++) {
        const self = _.clone(root['children'][i]);
        const parent = _.clone(root);
        if (self.id === selectedNodeId) {
          const uncle = {};
          const grandparent = {};
          this.setNewItem(grandparent, 'branch', true);
          this.setNewItem(uncle, 'leaf', false);
          
          self['addPanelShow'] = false;
          parent['addPanelShow'] = false;
          grandparent['addPanelShow'] = false;

          grandparent['children'].push(parent);
          grandparent['children'].push(uncle);
          root = grandparent;
          this.selectedNode = { data: uncle };
          return root;
        }
        root['children'][i] = this.preNestingLevel(root['children'][i], selectedNodeId);
      }
    }
    return root;
  }

  /**
   * nest this level
   * @param d :current node
   */
  nestingLevel(selectedNodeId) {
    this.selectedNode = null;
    this.treeData = this.preNestingLevel(this.treeData, selectedNodeId);
    this.onSelectNode(this.selectedNode);
    this.chart();
    this.getFormula();
  }

  /**
   * Set new item
   */
  setNewItem(data, type, selected) {
    this.idCurrent += 1;
    _.set(data, 'id', this.idCurrent);
    _.set(data, 'type', type);
    _.set(data, 'selected', selected);
    _.set(data, 'disabled', false);
    _.set(data, 'height', this.heightNodeLeaf);
    _.set(data, 'maxDepth', 0);
    _.set(data, 'maxXAddbuttonNodeTree',0);
    _.set(data, 'addGroupButtonHeight', this.heightNodeLeaf);
    _.set(data, 'selectedSubTree', false);
    if (type === 'leaf') {
      this.idStatement++;
      _.set(data, 'statementId', this.idStatement);
      _.set(data, 'propertyCategory', '');
      _.set(data, 'propertySubcategory', '');
      _.set(data, 'property', '');
      _.set(data, 'relationalOperator', '');
      _.set(data, 'name', 'S' + this.idStatement);
      _.set(data, 'value', '');
      _.set(data, 'children', null);
      _.set(data, 'addPanelShow', false);
      _.set(data, 'nodeFomula', 'S' + this.idStatement);
      // the max x value of add-button on this node tree, no matter if the node is leaf or branch
    } else if (type === 'branch') {
      _.set(data, 'name', 'AND');
      _.set(data, 'logicalOperator', 'AND');
      _.set(data, 'children', []);
      _.set(data, 'nodeFomula', 'AND');
      // the max x value of add-button on this node tree, no matter if the node is leaf or branch
    }
  }

  /**
   * Set new item
   */
  getFormula() {
    if (_.isEqual(this.treeData, {}) || this.treeData === null) {
      this.formula = 'No statement added yet';
      return;
    }
    this.formula = '';

    this.treeData = this.preSetSelectedFomulaNode(this.treeData);
    this.treeData = this.preOrderTraverse1(this.treeData);

    this.formulas = this.formula ? this.formula.split('<active>') : [];

    d3.select('#formula').style('width',
      (this.formula && this.formula.length * 10 > this.width ?
        this.formula.length * 8 : this.width) + 'px');

  }

  /**
   * pre Order Traverse1 for fomula
   */
  preOrderTraverse1(root) {
    if (root) {
      if (root.id === this.treeData['id']) {
        if (!root['children']) {
          this.formula = root.nodeFomula;
        }
      }

      if (root['children']) {
        let formulaRoot = ('(' + ' ');
        this.formula += ('(' + ' ');
        for (let i = 0; i < root.children.length; i++) {
          this.preOrderTraverse1(root.children[i]);
          formulaRoot += (i !== root.children.length - 1 ?
            (root.children[i].nodeFomula + ' ' + root.nodeFomula + ' ') :
            root.children[i].nodeFomula);
          if (root.children[i].type === 'leaf') {
            this.formula += (i !== root.children.length - 1 ?
              (root.children[i].nodeFomula + ' ' + root.nodeFomula + ' ') :
              root.children[i].nodeFomula);
          } else {
            this.formula += (i !== root.children.length - 1 ?
              (' ' + root.nodeFomula + ' ') :
              ' ');
          }
        }
        this.formula += (')' + ' ');

        formulaRoot += (')' + ' ');
        root.formulaLevel = formulaRoot;
      }

    }
    return root;

  }


  /**
   * init tree
   */
  initTree() {
    this.tree = d3.tree().nodeSize([this.dx, this.dy]);

  }

  /**
   * draw chart
   */
  chart() {
    const root = d3.hierarchy(this.treeData) as any;
    root.x0 = 0;
    root.y0 = 0;
    d3.select('#tree svg').remove();
    const svg = d3.select('#tree').append('svg')
      .attr('viewBox', `0,0,${this.width},${this.height}`)
      .attr('width', this.width)
      .attr('height', this.height)
      .style('font', '12px')
      .style('user-select', 'none');

    const gNode = svg.append('g')
      .attr('class', 'g-tree')
      .attr('cursor', 'pointer')
      .attr('pointer-events', 'all');

    this.update(root, svg, gNode);
    return svg.node();
  }

  /**
   * update chart
   */
  update(root, svg, gNode) {
    // Compute the new tree layout.
    this.tree(root);
    this.preHeight(root);
    this.preX(root);
    const nodes = root.descendants().reverse();

    //  tree g width and height
    let widthG = 0;
    let heigthG = 0;

    // svg width and height
    let widthSVG = this.width;
    let heightSVG = this.height;


    const transition = svg
      .attr('width', widthSVG)// for add panel
      .attr('height', heightSVG)
      .attr('viewBox', `0,0,${widthSVG},${heightSVG}`);

    gNode.attr('transform', `translate(${widthSVG / 2},${heightSVG / 2})`);

    // Update the nodes…
    const node = gNode.selectAll('g')
      .data(nodes, d => d.data.id);

    // Enter any new nodes at the parent's previous position.
    const nodeEnter = node.enter().append('g')
      .attr('transform', d =>
        `translate(${(this.widthBranch + this.widthMarginBetweenNode) * d.depth},
        ${ d.x})`)
      .attr('fill-opacity', 1)
      .attr('stroke-opacity', 1);

    this.drawLeaf(nodeEnter, svg, gNode, root);
    this.drawBranch(nodeEnter, svg, gNode, root);

    const gbox = gNode.node().getBBox();

    widthSVG = (gbox.width + this.margin.left + this.margin.right) < this.width ?
      this.width : (gbox.width + this.margin.left + this.margin.right);
    heightSVG = (gbox.height + this.margin.top + this.margin.bottom) < this.height ?
      this.height : (gbox.height + this.margin.top + this.margin.bottom);
    svg.attr('width', widthSVG)// for add panel
      .attr('height', heightSVG)
      .attr('viewBox', `0,0,${widthSVG},${heightSVG}`);

    gNode.attr('transform', `translate(${(widthSVG - gbox.width) / 2},
      ${(heightSVG - gbox.height) / 2})`);

  }

  // x height  maxDepth
  preHeight(rootNode) {
    if (rootNode) {
      if (rootNode['children']) {
        rootNode.data.height = 0;
        for (let i = 0; i < rootNode.children.length; i++) {
          this.preHeight(rootNode.children[i]);
          // leaf height
          if (rootNode.children[i].data.type === 'leaf') {
            rootNode.children[i].data.height = this.heightNodeLeaf;
            rootNode.children[i].data.maxDepth = 0;
          }
          rootNode.data.height += (rootNode.children[i].data.height + this.heightMarginBetweenNode);
        }
        rootNode.data.height -= this.heightMarginBetweenNode;
        // max depth
        rootNode.data.maxDepth = 1 + d3.max(rootNode.children, d => d['data'].maxDepth);
      }
    }
  }

  // x   (in fact is y)
  preX(rootNode) {
    if (rootNode) {
      if (rootNode['children']) {
        for (let i = 0; i < rootNode.children.length; i++) {
          // branch height
          if (i === 0) {
            rootNode.children[i].x = rootNode.x;
          } else {
            rootNode.children[i].x =
              (rootNode.children[i - 1].x + rootNode.children[i - 1].data.height +
                this.heightMarginBetweenNode);
          }
          this.preX(rootNode.children[i]);

        }
      }
    }
  }

  // get width of rect leaf by width of text
  getWidthLeafRect(d) {
    const width = d3.select('#leafText' + d.data.id).node().getComputedTextLength() + 30;
    if (d.parent &&
      width + this.widthMarginBetweenNode > d.parent.data.maxXAddbuttonNodeTree)
      d.parent.data.maxXAddbuttonNodeTree = width + this.widthMarginBetweenNode;
    d.data.maxXAddbuttonNodeTree = width + this.widthMarginBetweenNode;
    return width;
  }
  // draw leaf
  drawLeaf(nodeEnter, svg, gNode, root) {
    const leafNodeEnter = nodeEnter.append('g')
      .attr('id', d => 'statement' + d.data.id)
      .attr('class', 'leaf-group')
      .attr('display', d => d.data.type === 'leaf' ? 'block' : 'none');

    leafNodeEnter.insert('rect')
      .attr('width',  this.widthDefaultStatement)
      .attr('height', d => d.data.height)
      .attr('class', 'leaf-rect')
      .attr('id', d => 'leafRect' + d.data.id)
      .attr('x', 0)
      .attr('y', 0)
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', d => d.data.selected ? '#0f6cff' :
        (d.data.disabled ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255)'))
      .on('click', d => {
        this.onSelectNode(d);
        this.chart();
        this.getFormula();
      });

    leafNodeEnter.append('text')
      .attr('y', '18')
      .attr('x', '18')
      .attr('class', 'leaf-text')
      .attr('id', d => 'leafText' + d.data.id)
      .attr('font-size', '12px')
      .attr('text-anchor', d => d.data.type === 'leaf' ? 'start' : 'middle')
      .text(d => (d.data.property || d.data.relationalOperator || d.data.value)
        ? (d.data.property + ' ' + d.data.relationalOperator + ' ' + d.data.value) :
        'No input yet')
      .attr('fill', d => d.data.selected ? '#ffffff' :
        (d.data.disabled ? 'rgba(104, 104, 104, 0.3)' : '#686868'))
      .attr('stroke-opacity', 0)
      .on('click', d => {
        this.onSelectNode(d);
        this.chart();
        this.getFormula();
      });

    leafNodeEnter.append('text')
      .attr('y', d => d.data.type === 'leaf' &&
        (!d.data.property && !d.data.relationalOperator &&
          !d.data.value) ? '22' : '24')
      .attr('x', '10')
      .attr('class', 'leaf-no')
      .attr('font-size', '12px')
      .attr('transform', 'scale(0.75)')
      .attr('text-anchor', 'middle')
      .text(d => d.data.type === 'leaf' ? d.data.statementId : '')
      .attr('fill', d => d.data.selected ? '#dbdbdb' :
        (d.data.disabled ? 'rgba(104, 104, 104, 0.3)' : '#9f9f9f'))
      .attr('stroke-opacity', 0);

    nodeEnter.select('.leaf-rect')
      .attr('width', d => this.getWidthLeafRect(d));

    const addNodeEnter = leafNodeEnter.append('g')
      .attr('class', 'add-button-group')
      .attr('display', d => !d.data.selected && d.data.selectedSubTree ? 'none' : 'block')
      .attr('transform', d => 'translate(' + (this.getWidthLeafRect(d) +
        this.widthMarginBetweenNode) + ',0)');

    addNodeEnter.insert('rect')
      .attr('class', 'add-btn-rect')
      .attr('width', '30')
      .attr('height', '30')
      .attr('rx', 15)
      .attr('ry', 15)
      .attr('x', 0)
      .attr('y', 0)
      .attr('fill', '#dbdbdb')
      .on('click', d => {
        this.onAddNode(d);
        this.removeAndAddPanel(d);
        this.chart();
      });

    addNodeEnter.append('image')
      .attr('class', 'add-btn-image')
      .attr('width', 16)
      .attr('height', 16)
      .attr('x', 7)
      .attr('y', 7)
      .attr('xlink:href', '../../assets/i/add-circle.png')
      .on('click', d => {
        this.onAddNode(d);
        this.removeAndAddPanel(d);
        this.chart();
      })
      ;
    this.addNodePanel(nodeEnter);


  }
  

  drawBranch(nodeEnter, svg, gNode, root) {
    const branchNodeEnter = nodeEnter.append('g')
      .attr('id', d => 'operator' + d.data.id)
      .attr('display', d => d.data.type === 'branch' ? 'block' : 'none');

    branchNodeEnter.insert('rect')
      .attr('width', this.widthBranch)
      .attr('height', d => d.data.height)
      .attr('x', 0)
      .attr('y', 0)
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', d => d.data.selected ? '#0f6cff' :
        (d.data.disabled ? 'rgba(255, 255, 255, 0.3)' :
          (d.data.addPanelShow ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.8)')))
      .on('click', d => {
        this.onSelectNode(d);
        this.chart();
        this.getFormula();
      });

    branchNodeEnter.append('text')
      .attr('y', d => d.data.height / 2 / 0.75)
      .attr('x', 19 / 0.75)
      .attr('font-size', '12px')
      .attr('transform', 'scale(0.75)')
      .attr('text-anchor', 'middle')
      .text(d => d.data.logicalOperator)
      .attr('fill', d => d.data.selected ? '#ffffff' :
        (d.data.disabled ? 'rgba(104, 104, 104, 0.3)' : '#686868'))
      .attr('stroke-opacity', 0)
      .on('click', d => {
        this.onSelectNode(d);
        this.chart();
        this.getFormula();
      });

    const addNodeEnter = branchNodeEnter.append('g')
      .attr('class', 'add-button-group')
      .attr('display', d => d.data.selected ? 'block' : 'none')
      .attr('transform', d => {
        return 'translate(' +
          (d.data.maxDepth * (this.widthBranch + this.widthMarginBetweenNode) +
            d.data.maxXAddbuttonNodeTree) + ', 0)'
      });

    addNodeEnter.insert('rect')
      .attr('class', 'add-btn-rect')
      .attr('width', '30')
      .attr('height', d => d.data.height)
      .attr('rx', 15)
      .attr('ry', 15)
      .attr('x', 0)
      .attr('y', 0)
      .attr('fill', '#dbdbdb')
      .on('click', d => {
        this.onAddNode(d);
        this.removeAndAddPanel(d);
        this.chart();
      });

    addNodeEnter.append('image')
      .attr('class', 'add-btn-image')
      .attr('width', 16)
      .attr('height', 16)
      .attr('x', d => 7)
      .attr('y', d => d.data.height / 2 - 7)
      .attr('xlink:href', '../../../../../assets/i/add-circle.png')
      .on('click', d => {
        this.onAddNode(d);
        this.removeAndAddPanel(d);
        this.chart();
      });

    this.addNodePanel(nodeEnter);
  }


  /**
   * add add-panel to node
   */
  addNodePanel(nodeEnter) {
    const addPanelEnter = nodeEnter.append('g')
      .attr('id', 'addPanel')
      .attr('display', d => d.data.addPanelShow ? 'block' : 'none')
      .attr('transform', d => `translate(${
        (d.data.maxDepth * (this.widthBranch + this.widthMarginBetweenNode) +
          d.data.maxXAddbuttonNodeTree)},0)`);


    addPanelEnter.insert('rect')
      .attr('width', '120')
      .attr('height', '128')
      .attr('x', 0)
      .attr('y', 0)
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', '#3d3d3d');
    addPanelEnter.insert('text')
      .attr('x', d => 8 / 0.75)
      .attr('y', (12 + 10) / 0.75)
      .attr('font-size', '12px')
      .attr('transform', 'scale(0.75)')
      .attr('text-anchor', 'start')
      .text('Add statement')
      .attr('fill', '#bababa');
    addPanelEnter.append('text')
      .attr('x', 8)
      .attr('y', 40 + 10)
      .attr('font-size', '13px')
      .attr('text-anchor', 'start')
      .text('Add to this level')
      .attr('fill', '#ffffff')
      .on('click', d => {
        this.addThisLevel(d.data.id);
      });
    addPanelEnter.append('text')
      .attr('x', 8)
      .attr('y', 72 + 10)
      .attr('font-size', '13px')
      .attr('text-anchor', 'start')
      .text('Add nested level')
      .attr('fill', '#ffffff')
      .on('click', d => {
        this.addNestedLevel(d.data.id);
      });
    addPanelEnter.append('text')
      .attr('x', 8)
      .attr('y', 104 + 10)
      .attr('font-size', '13px')
      .attr('text-anchor', 'start')
      .text('Nest this level')
      .attr('fill', '#ffffff')
      .on('click', d => {
        this.nestingLevel(d.data.id);
      });

  }

  preRemoveAndAddPanel(root, id) {
    if (root) {
      if (root.id === this.treeData['id']) {
        root.addPanelShow = (root.id === id);
      }

      if (root['children']) {
        for (let i = 0; i < root['children'].length; i++) {
          root['children'][i].addPanelShow = (root['children'][i].id === id);
          this.preRemoveAndAddPanel(root['children'][i], id);
        }
      }
      return root;
    }
  }
  /*
  * remove other panel and add new one
  */
  removeAndAddPanel(d) {
    this.treeData = this.preRemoveAndAddPanel(this.treeData, d.data.id);
    this.chart();
  }

  /*
  * set active fomula item
  */
  preSetSelectedFomulaNode(root) {
    if (root) {
      if (root.id === this.treeData['id']) {
        if (root.type === 'leaf') {
          root.nodeFomula = (root.selected ? ('<active>' + root.name + '<active>') : root.name);
        } else {
          root.nodeFomula = (root.selected ? ('<active>' + root.logicalOperator + '<active>')
            : root.logicalOperator);
        }

      }

      if (root['children']) {
        for (let i = 0; i < root['children'].length; i++) {

          if (root['children'][i].type === 'leaf') {
            root['children'][i].nodeFomula = root['children'][i].selected ? ('<active>' +
              root['children'][i].name + '<active>') : root['children'][i].name;
          } else {
            root['children'][i].nodeFomula = root['children'][i].selected ? ('<active>' +
              root['children'][i].logicalOperator + '<active>') :
              root['children'][i].logicalOperator;
          }

          this.preSelectNode(root['children'][i]);
        }
      }
    }
    return root;
  }

  /*
  * select new node and unselect others
  * set active fomula item
  */
  preSelectNode(root) {
    if (root) {
      if (root.id === this.treeData['id']) {
        root.selected =
          (this.selectedNode && this.selectedNode.data.id
            === root.id);
        root.nodeFomula = root.selected ? '<active>' +
          (root.type === 'leaf' ? root.name : root.logicalOperator) + '<active>' :
          (root.type === 'leaf' ? root.name : root.logicalOperator);
        root.addPanelShow = false;
        root.selectedSubTree = (this.selectedNode && this.selectedNode.data.id === root.id);
      }

      if (root['children']) {
        for (let i = 0; i < root['children'].length; i++) {
          root['children'][i].selected =
            (this.selectedNode && this.selectedNode.data.id === root['children'][i].id);
          root['children'][i].nodeFomula = root['children'][i].selected ? '<active>' +
            (root['children'][i].type === 'leaf' ? root['children'][i].name :
              root['children'][i].logicalOperator)
            + '<active>' : (root['children'][i].type === 'leaf' ? root['children'][i].name :
              root['children'][i].logicalOperator);
          root['children'][i].addPanelShow = this.selectedNode && this.selectedNode.data.id === root['children'][i].id ?
            false : root['children'][i].add;
          root['children'][i].selectedSubTree =
            (this.selectedNode && this.selectedNode.data.id === root['children'][i].id)
            || root.selectedSubTree;

          root['children'][i] = this.preSelectNode(root['children'][i]);
        }

      }
    }
    return root;
  }

  onSelectNode(d) {
    if (this.treeData && !_.isEqual(this.treeData, {})) {
      this.selectedNode = d;
      //select new node and unselect others, set active fomula item
      const tm = this.preSelectNode(this.treeData);
      this.treeData = _.clone(tm);
      this.selectAndSetPanelData(d);
    }
  }


  /*
  * select new node and unselect others
  * set active fomula item
  */

  preAddNode(root, id) {
    if (root) {
      if (root.id === this.treeData['id'] && !root['children']) {
        if (id === root.id) {
          root.addPanelShow = true;
        } else {
          root.addPanelShow = false;
        }
      }

      if (root['children']) {
        for (let i = 0; i < root['children'].length; i++) {
          if (id === root['children'][i].id) {
            root['children'][i].addPanelShow = true;
          } else {
            root['children'][i].addPanelShow = false;
          }

          this.preAddNode(root['children'][i], id);
        }
      }
      return root;
    }
  }

  onAddNode(d) {
    if (this.treeData && !_.isEqual(this.treeData, {})) {
      this.treeData = this.preAddNode(this.treeData, d.id);
    }
  }

  selectAndSetPanelData(d) {
    if (!d) {
      this.panelData.type = 'default';
    } else if (d.data.type === 'leaf') {
      this.panelData = {
        type: 'leaf',
        id: d.data.id,
        statementId: d.data.statementId,
        level: d.depth,
        logicalOperator: '',
        propertyCategory: d.data.propertyCategory,
        propertySubcategory: d.data.propertySubcategory,
        property: d.data.property,
        relationalOperator: d.data.relationalOperator,
        value: d.data.value
      };
    } else if (d.data.type === 'branch') {
      this.panelData = {
        type: 'branch',
        id: d.data.id,
        statementId: -1,
        level: d.depth,
        logicalOperator: d.data.logicalOperator,
        propertyCategory: '',
        propertySubcategory: '',
        property: '',
        relationalOperator: '',
        value: ''
      };
    }
  }


  /**
   * pre Order Traverse1
   */
  updateData(root) {
    if (root == null) {
      return;
    }

    if (root.id === this.panelData.id) {
      if (root.type === 'leaf') {
        root.propertyCategory = this.panelData.propertyCategory,
          root.property = this.panelData.property;
        root.relationalOperator = this.panelData.relationalOperator;
        root.value = this.panelData.value;
      } else if (root.type === 'branch') {
        root.logicalOperator = this.panelData.logicalOperator;
      }
      return;
    }

    if (root.type === 'branch') {
      for (let i = 0; i < root.children.length; i++) {
        this.updateData(root.children[i]);
      }
    }
  }

  /**
   * update chart
   */
  changePanelData() {
    this.updateData(this.treeData);
    this.chart();
    this.getFormula();
  }

  preGetNestedLevel(root, id, count) {
    if (root) {
      if (root.id === this.treeData['id']) {
        if (root.id === id) {
          count = 0;
        }
      }

      if (root['children']) {
        for (let i = 0; i < root['children'].length; i++) {
          this.preGetNestedLevel(root['children'][i], id, count);
          if (root['children'][i].id === id) {
            count = 0;
          } else if (count > -1) {
            count++;
          }
          break;
        }
      }
    }
    return count;
  }

  preDeleteNode(root, id) {
    if (root) {
      if (root.id === this.treeData['id'] && root.id === id) {
        root = {};
      }

      if (root['children']) {
        for (let i = 0; i < root['children'].length; i++) {
          if (root['children'][i].id === id) {
            if (root['children'].length === 2) {
              const tmp = _.clone(root['children'][1 - i]);
              root = _.clone(tmp);
              console.log(root);
            } else {
              root['children'].splice(i, 1);
              console.log(root);
            }
            return root;
          }
          root['children'][i] = this.preDeleteNode(root['children'][i], id);
        }
      }
    }
    return root;
  }

  deleteNode(id) {
    this.treeData = this.preDeleteNode(this.treeData, id);

  }
  // delete
  onDelete(panelData) {

    const modalRef = this.modalService.open(ConfirmComponent, { centered: true });
    modalRef.componentInstance.title = 'Are you sure?';
    modalRef.componentInstance.data = {
      content: panelData['type'] === 'branch' ?
        ('You’re about to delete Level ' + panelData['id'] +
          'Deleting this level will also delete its child level(s) ' +
          'and reset the formula.') :
        ('You’re about to delete Statement ' + panelData['statementId'] +
          ' Deleting this statement will reset the formula.'),
      type: 'delete',
      dataType: panelData['type']
    };
    modalRef.result.then(ret => {
      if (ret.type === 'delete') {

        this.deleteNode(panelData['id']);
        this.onSelectNode(null);
        this.getFormula();


        if (_.isEqual(this.treeData, {})) {
          this.resetAll();
        } else {
          this.chart();
        }

        this.addDonePopup = true;
        this.submitted = false;
        this.donePopupContent = (panelData['type'] === 'branch' ?
          ('Level ' + panelData['id']) : ('Statement ' + panelData['name']))
          + ' was deleted';
        setTimeout(() => {
          this.addDonePopup = false;
        }, 2000);
      }
    }, () => {
    });
  }

  resetAll() {
    // tree

    this.treeData = {};
    this.idCurrent = 0;
    this.idStatement = 0;
    this.addFirstShow = true;

    this.margin = ({ top: 10, left: 10, right: 10, bottom: 10 });
    this.dx = 10;
    this.dy = this.width / 6;
    this.formula = 'No statement added yet';
    this.formulas = [];
    this.selectedNode = null;
    this.leafCount = 0;
    this.widthTree = 0;
    this.addDonePopup = false;
    this.donePopupContent = '';
    this.panelData = {
      type: 'default',
      id: -1,
      statementId: -1,
      level: 0,
      logicalOperator: '',
      propertyCategory: '',
      propertySubcategory: '',
      property: '',
      relationalOperator: '',
      value: ''
    };
    this.beFirst = false;


    this.getFormula();
    d3.select('#tree svg').remove();
  }

  getResetDisableStatus() {
    return !this.treeData || _.isEqual(this.treeData, {});
  }
  // reset
  onReset() {
    if (this.getResetDisableStatus()) {
      return;
    }
    const modalRef = this.modalService.open(ConfirmComponent, { centered: true });
    modalRef.componentInstance.title = 'Are you sure?';
    modalRef.componentInstance.data = {
      content: 'Resetting the formula will remove all statements. This action can not be undone.',
      type: 'reset'
    };
    modalRef.result.then(ret => {
      if (ret.type === 'reset') {

        this.resetAll();

        this.addDonePopup = true;
        this.submitted = false;
        this.donePopupContent = 'Editor was reset';
        setTimeout(() => {
          this.addDonePopup = false;
        }, 2000);
      }
    }, () => {
    });
  }



  onSubmit() {
    this.submitted = true;
    // stop here if form is invalid

  }
}
