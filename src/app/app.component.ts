import { HostListener, Component } from '@angular/core';
import { HistoryService } from './history.service';
import { HistoryEntry } from './history-entry';
import { SimpleMath } from './simple-math';
import { MathNode, UnaryOperator, BinaryOperator, Operand } from './infix-nodes';

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: [ './app.component.css' ]
})
export class AppComponent  {
  root: MathNode = null;
  expression = '';
  storedOperand = '';
  operand = '';
  resetOperand = false;
  hasResult = false;
  operationKey = '';
  showHistory = true;
  isMouseDown = false; 

  actions = [
    [{key: '%'}, {key: 'e', text:'CE'}, {key: 'C'}, {key: 'Backspace', text: '<'}],
    [{key: 'i', text: 'inv'}, {key: 's', text:'sqr'}, {key: 'r', text:'sqrt'}, {key: '/'}],
    [{key: '7'}, {key: '8'}, {key: '9'}, {key: 'x'}],
    [{key: '4'}, {key: '5'}, {key: '6'}, {key: '-'}],
    [{key: '1'}, {key: '2'}, {key: '3'}, {key: '+'}],
    [{key: 't', text:'+/-'}, {key: '0'}, {key: '.'}, {key: '='}],
  ]

  keyHandlers = {
    '.': this.addDecimalPoint,
  }

  constructor(
    private historyService: HistoryService,
  ) { 
    console.log("constructor");
  }

  handleClick(key) {
    if(this.isMouseDown) {
      this.handleKey(key);
      this.isMouseDown = false;
    }  
  }

  @HostListener('window:mousedown', ['$event'])
  handleMouseDown(event) {
    // lock mousedown var so that handleClick 
    // may delegate action to handleKey method.
    // this way, we will only handle button actions
    // that were triggered using mouse.
    // All keyboard button triggers (space or enter)
    // should be treated as 'compute result' action.
    this.isMouseDown = true;
  }
  
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    this.handleKey(event.key);
  }

  @HostListener('window:resize', ['$event'])
  handleResize(event) {
    this.checkShowHistory();
  }

  ngOnInit() {
    this.checkShowHistory();
  }

  private checkShowHistory() {
    this.showHistory = window.innerWidth >= 400;
  }
  
  handleKey(key: string) {
    console.log(key)
    if(key === 'Enter' || key === '=' || key == ' ') {
      this.opResult();
      return;
    }

    if (key === '%') {
      this.operand = this.fixPrecision(+this.storedOperand * +this.operand / 100).toString();
      this.opResult();
      return;
    }

    if(MathNode.hasOperator(key)) {
      this.operationKey = key;
      this.storedOperand = this.operand;
      this.resetOperand = true;
      this.hasResult = false;

      var newNode: MathNode = new Operand(this.operand);
      if(this.root != null && this.root instanceof BinaryOperator) {
        this.root.right = newNode;
        this.operand = this.root.compute();
        newNode = this.root;
      }
      this.root = MathNode.createOperator(this.operationKey, newNode);
      this.expression = this.root.toString();

      if (this.root instanceof UnaryOperator) {
        this.opResult();
      }

      return;
    }

    if(key === 'Backspace' || key === '<') {
      if(this.hasResult) {
        this.expression = '';
      } else {
        this.operand = this.operand.length > 1 ? this.operand.slice(0,-1) : '0';
      }
    }

    if(key === 'c' || key === 'C') {
      this.clear()
      return;
    }

    if(key === 'e' || key === 'E') {
      this.operand = '0';
      this.resetOperand = true;
      return;
    }

    // the operators below will append to operand text
    if(this.operand.length > 12 && !this.resetOperand) {
      // We will limit the operand length so that it will fit in the html input
      return;
    } 

    if(key === 't') {
      this.operand = (- +this.operand).toString();
    }

    if(key === 'i') {
      this.storedOperand = '1';
      this.operationKey = '/';
      this.hasResult = false;
      this.opResult();
      return;
    }

    if(key.match(/\d/)) {
      if(this.hasResult) {
        this.clear();
      }

      if(this.resetOperand || this.operand === '0') {
        this.operand = '';
        this.resetOperand = false;
      }

      this.operand += key;
      return;
    }

    if(this.keyHandlers.hasOwnProperty(key)) {
      this.operand = this.keyHandlers[key](this.operand);
    }
  }

  addDecimalPoint(operand: string) {
    return operand.includes('.') ? operand : operand + '.'; 
  }

  clear() {
    this.root = null;
    this.resetOperand = true;
    this.hasResult = false;
    this.expression = '';
    this.operand = '0';
    this.storedOperand = '';
    this.operationKey = '';
  }

  fixPrecision(number) {
    return parseFloat(number.toPrecision(12));
  }

  opResult() {
    if(!MathNode.hasOperator(this.operationKey)) {
      // the given operation is not supported or not defined
      console.error(`Operation not defined = '${this.operationKey}'`)
      return;
    }

    var leftOp, rightOp;
    if(this.hasResult) {
      [leftOp, rightOp] = [this.operand, this.storedOperand];
    } else {
      [leftOp, rightOp] = [this.storedOperand, this.operand];
      this.storedOperand = this.operand;
    }

    if(this.root == null) {
      this.root = MathNode.createOperator(this.operationKey, new Operand(leftOp));
    }

    if(this.root instanceof BinaryOperator) {
      this.root.right = new Operand(rightOp);        
    }
    
    this.expression = this.root.toString() + " =";
    this.operand = this.fixPrecision(this.root.compute()).toString();
    this.root = null;

    this.hasResult = true;
    this.resetOperand = true;
    this.historyService.add(this.expression, this.operand, this.storedOperand, this.operationKey);
  }

  onSelectHistory(entry: HistoryEntry) { 
    this.clear();
    this.expression = entry.operands;
    this.operand = entry.result;
    this.storedOperand = entry.storedOperand;
    this.operationKey = entry.operationKey;
    this.hasResult = true;
    this.resetOperand = true;
  }
}
