import { Component, OnInit } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { Validators, FormGroup, FormBuilder, FormArray, FormControl } from '@angular/forms';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { faStar, faPlus } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import { WebcamImage, WebcamInitError, WebcamUtil } from 'ngx-webcam';
import * as moment from 'moment';

import { AppServicesService } from './../../shared/service/app-services.service';

declare var $: any;

@Component({
  selector: 'app-edit-claim',
  templateUrl: './edit-claim.component.html',
  styleUrls: ['./edit-claim.component.css']
})
export class EditClaimComponent implements OnInit {

  // toggle webcam on/off
  public showWebcam = false;
  public allowCameraSwitch = true;
  public multipleWebcamsAvailable = false;
  public deviceId: string;
  closeResult: string;
  selectedwebcamrow: any;
  public videoOptions: MediaTrackConstraints = {
    // width: {ideal: 1024},
    // height: {ideal: 576}
  };
  public errors: WebcamInitError[] = [];

  // latest snapshot
  public webcamImage: WebcamImage = null;

  // webcam snapshot trigger
  private trigger: Subject<void> = new Subject<void>();
  // switch to next / previous / specific webcam; true/false: forward/backwards, string: deviceId
  private nextWebcam: Subject<boolean | string> = new Subject<boolean | string>();

  faStar = faStar;
  faPlus = faPlus;
  heading = 'Edit / Update Claim';
  subheading = 'Update a claim and save it to draft page.';
  icon = 'pe-7s-network icon-gradient bg-premium-dark';

  claimForm: FormGroup;
  submitted = false;
  btnLoader = false;

  types: any = [
    { id: 'scheme', name: 'Scheme and Rate Difference' },
    { id: 'sample', name: 'Sample Sales' }
  ];
  months: any = [
    { id: 1, name: '01 - January' },
    { id: 2, name: '02 - February' },
    { id: 3, name: '03 - March' },
    { id: 4, name: '04 - April' },
    { id: 5, name: '05 - May' },
    { id: 6, name: '06 - June' },
    { id: 7, name: '07 - July' },
    { id: 8, name: '08 - August' },
    { id: 9, name: '09 - September' },
    { id: 10, name: '10 - October' },
    { id: 11, name: '11 - November' },
    { id: 12, name: '12 - December' },
  ];

  years: any = [];
  sessionData: any;
  currentYear: any;
  currentMonth: any;
  records: any = [];
  batches: any = [];
  products: any = [];
  newFiles: any = [];
  divisions: any = [];
  fileNames: any = [];
  stockiests: any = [];
  alignedStockiest: any = [];
  requiredFileType: string;
  selectedClaim: any;
  defaultValue: any = {
    mrp: '0.00',
    pts: '0.00',
    ptr: '0.00',
    ptd: '0.00',
    margin: 10,
    difference: '0.00',
    totalDifference: '0.00',
    amount: '0.00'
  };
  distributors: any = [];
  userDistributors: any = [];
  userPlantStockists: any = [];
  userPlantDivisions: any = [];


  constructor(
    private router: Router,
    private fb: FormBuilder,
    private activatedRoute: ActivatedRoute,
    private apiService: AppServicesService,
    private modalService: NgbModal
  ) {
    this.selectedClaim = this.activatedRoute.snapshot.paramMap.get('claimId');
  }

  ngOnInit() {
    const sessionData = sessionStorage.getItem("laUser");
    if (!sessionData) this.router.navigateByUrl('/login');
    this.sessionData = JSON.parse(sessionData);

    // Current Month and Year
    const currentMonth = moment().format("MM");
    this.currentMonth = parseInt(currentMonth);

    // To show previous 2 years in dropdown
    const currentYear = moment().format("YYYY");
    this.currentYear = parseInt(currentYear);
    for (var i = parseInt(currentYear); i > parseInt(currentYear) - 3; i--) {
      const year = { id: i, name: i };
      this.years.push(year);
    }

    this.createForm();
    this.getDistributors();
    this.getProduct();
    this.getBatch();

    this.delay(1000).then(any => {
      this.isDistributors();
    });

    /* if (JSON.parse(sessionData).type === 'ho' || JSON.parse(sessionData).type === 'field') {
      this.getUserDistStockistDivision(this.loggedUserId);
    } else if (JSON.parse(sessionData).type === 'stockist') {
      this.getStockistDistDivision(this.loggedUserId);
    }

    this.delay(1000).then(any => {
      this.getData();
    }); */
    WebcamUtil.getAvailableVideoInputs().then((mediaDevices: MediaDeviceInfo[]) => {
      this.multipleWebcamsAvailable = mediaDevices && mediaDevices.length > 1;
    });
  }

  isDistributors() {
    if (this.distributors[0]) {
      if (this.sessionData.type === 'ho' || this.sessionData.type === 'field') {
        this.getUserDistStockistDivision();
      } else if (this.sessionData.type === 'stockist') {
        this.getStockistDistDivision();
      } else if (this.sessionData.type === 'distributor') {
        // this.getDivisionCustomerIds();
      }
    } else {
      this.getDistributors();

      this.delay(1000).then(any => {
        this.isDistributors();
      });
    }
  }

  public triggerSnapshot(): void {
    this.trigger.next();
    //let serow = this.selectedwebcamrow;
    const row = (this.selectedwebcamrow === 'def') ? -1 : this.selectedwebcamrow;
    const reqData = {};
    // console.log("selected web cam row===", this.selectedwebcamrow);
    //const frmData = new FormData();

    //console.log(this.webcamImage.imageAsBase64);
    //frmData.append("file", this.webcamImage.imageAsBase64);
    reqData['camimg'] = this.webcamImage.imageAsBase64;


    this.apiService.upload('/api/UploadClaimInvoicesWebcam', reqData).subscribe((response: any) => {
      if (response.status === 200) {
        if (response.data.length) {
          // To separate files according to RowId
          if (this.fileNames[row]) {
            // If RowId already have data
            response.data.forEach(element => {
              this.fileNames[row].push(element);
            });
          } else {
            // To create and insert data for new RowId
            this.fileNames[row] = response.data;
          }
          this.newFiles.push(response.data);
        }
      } else {
        this.toast('error', response.message);
      }
    })
  }

  public toggleWebcam(): void {
    this.showWebcam = !this.showWebcam;
  }

  public handleInitError(error: WebcamInitError): void {
    this.errors.push(error);
  }

  public showNextWebcam(directionOrDeviceId: boolean | string): void {
    // true => move forward through devices
    // false => move backwards through devices
    // string => move to device with given deviceId
    this.nextWebcam.next(directionOrDeviceId);
  }

  public handleImage(webcamImage: WebcamImage): void {
    //console.info('received webcam image', webcamImage);
    this.webcamImage = webcamImage;
  }

  public cameraWasSwitched(deviceId: string): void {
    //console.log('active device: ' + deviceId);
    this.deviceId = deviceId;
  }

  public get triggerObservable(): Observable<void> {
    return this.trigger.asObservable();
  }

  public get nextWebcamObservable(): Observable<boolean | string> {
    return this.nextWebcam.asObservable();
  }

  toast(typeIcon, message) {
    // typeIcon = error, success, warning, info, question
    Swal.fire({
      toast: true,
      position: 'top-right',
      showConfirmButton: false,
      icon: typeIcon,
      timerProgressBar: true,
      timer: 5000,
      title: message
    })
  }

  createForm() {
    this.claimForm = this.fb.group({
      def_invoice: '',
      def_batch: '',
      def_division: '',
      def_divisionId: '',
      def_plantId: '',
      def_product: '',
      def_productId: '',
      def_particulars: '',
      def_mrp: this.defaultValue.mrp,
      def_pts: this.defaultValue.pts,
      def_billingRate: '',
      def_margin: this.defaultValue.margin,
      def_freeQuantity: '',
      def_saleQuantity: '',
      def_difference: this.defaultValue.difference,
      def_totalDifference: this.defaultValue.totalDifference,
      def_amount: this.defaultValue.amount,
      def_image: '',
      claims: this.fb.array([]),
    });
  }

  claims(): FormArray {
    return this.claimForm.get("claims") as FormArray
  }

  newClaim(): FormGroup {
    return this.fb.group({
      invoice: '',
      batch: '',
      division: '',
      product: '',
      particulars: '',
      mrp: this.defaultValue.mrp,
      pts: this.defaultValue.pts,
      billingRate: '',
      margin: this.defaultValue.margin,
      freeQuantity: '',
      saleQuantity: '',
      difference: this.defaultValue.difference,
      totalDifference: this.defaultValue.totalDifference,
      amount: this.defaultValue.amount,
      image: ''
    })
  }

  addNewInvoice() {
    this.claims().push(this.newClaim());

    const lastRow = $(".count").last().val();
    const currentRowId = parseInt(lastRow) + 1
    setTimeout(function () {
      if (lastRow === undefined) {
        $('#invoice_0').focus();
      } else {
        $('#invoice_' + currentRowId).focus();
      }
      $('table').scrollLeft(0);   // To scroll left
    }, 5);
  }

  addSameInvoice(i: number) {
    if (i === -1) {   // Default row validation and copy/clone
      let error = 0;

      $('.grf-def').removeClass('grf-invalid');

      // If error border color will be red.
      if (!$('#invoice_def').val()) {
        error = 1;
        $('#invoice_def').addClass('grf-invalid');
      }

      // Fill value of the field 
      if (!error) {
        const claimData = this.fb.group({
          invoice: $('#invoice_def').val(),
          batch: '',
          division: '',
          product: '',
          particulars: '',
          mrp: this.defaultValue.mrp,
          pts: this.defaultValue.pts,
          billingRate: '',
          margin: this.defaultValue.margin,
          freeQuantity: '',
          saleQuantity: '',
          difference: this.defaultValue.difference,
          totalDifference: this.defaultValue.totalDifference,
          amount: this.defaultValue.amount,
          image: ''
        })

        this.claims().push(claimData);

        //setTimeout(function () {
        //$('#invoice_0').val(defaultInvoice);
        //this.claimForm.value.claims[0].invoice = defaultInvoice;
        //}, 1);
      }
    } else {
      let error = 0;
      $('.grf-am').removeClass('grf-invalid');

      // If error border color will be red.
      if (!$('#invoice_' + i).val()) {
        error = 1;
        $('#invoice_' + i).addClass('grf-invalid');
      }

      // Fill value of the field 
      if (!error) {
        const claimData = this.fb.group({
          invoice: $('#invoice_' + i).val(),
          batch: '',
          division: '',
          product: '',
          particulars: '',
          mrp: this.defaultValue.mrp,
          pts: this.defaultValue.pts,
          billingRate: '',
          margin: this.defaultValue.margin,
          freeQuantity: '',
          saleQuantity: '',
          difference: this.defaultValue.difference,
          totalDifference: this.defaultValue.totalDifference,
          amount: this.defaultValue.amount,
          image: ''
        })

        this.claims().push(claimData);
      }
    }

    $('table').scrollLeft(0);   // To scroll left
  }

  removeClaim(i: number) {
    this.claims().removeAt(i);

    // Delete selected row object.
    delete this.fileNames[i];

    // serialize the index of the objects after delete,
    // so that it can appear in the attachments column and the data can be extracted while submitting the form.
    let newFileNames = [];
    if (this.fileNames[-1]) {
      newFileNames[-1] = this.fileNames[-1];
    }
    this.fileNames.forEach(element => {
      newFileNames.push(element);
    });
    this.fileNames = newFileNames;
    // EOF serialize the index of the objects after delete.
  }

  onFileSelected(event, row) {
    const rowId = (row === -1) ? 'def' : row;

    const frmData = new FormData();
    // formData.append("file", event.target.files[0]);
    for (var i = 0; i < event.target.files.length; i++) {
      frmData.append("file", event.target.files[i]);
    }

    this.apiService.upload('/api/UploadClaimInvoices', frmData).subscribe((response: any) => {
      if (response.status === 200) {
        if (response.data.length) {
          // To separate files according to RowId
          if (this.fileNames[row]) {
            // If RowId already have data
            response.data.forEach(element => {
              this.fileNames[row].push(element);
            });
          } else {
            // To create and insert data for new RowId
            this.fileNames[row] = response.data;
          }
          this.newFiles.push(response.data);
        }
      } else {
        this.toast('error', response.message);
      }
    })
  }

  async delay(ms: number) {
    await new Promise(resolve => setTimeout(() => resolve(''), ms)).then(() => console.log("Fired"));
  }

  /***** Division key-up functionality *****/
  searchDivision(e, i) {
    const id = (i === -1) ? 'def' : i;
    const inputVal = e.currentTarget.value;

    $('#division_id_' + id).val('');
    $('#plant_id_' + id).val('');
    $('#product_' + id).val('');
    $('#product_id_' + id).val('');
    $('#batch_' + id).val('');
    $('#mrp_' + id).val(Number(0).toFixed(2));
    $('#pts_' + id).val(Number(0).toFixed(2));
    $('#billingRate_' + id).val('');

    this.changeCalculation(e, i);



    if (inputVal.length) {
      $('#division_loader_' + id).show();
      let results: any = [];
      results = this.matchDivision(inputVal, i);

      this.delay(10).then(any => {
        this.divisionSuggestions(results, inputVal, i);
      });
    } else {
      $('#division_suggestion_' + id).hide();
    }
  }

  matchDivision(str, i) {
    let results = [];
    const val = str.toLowerCase();

    results = this.divisions.filter(function (d) {
      return d.name.toLowerCase().indexOf(val) > -1;
    });

    return results;
  }

  divisionSuggestions(results, inputVal, row) {
    const id = (row === -1) ? 'def' : row;

    const suggestions = document.querySelector('#division_suggestion_' + id + ' ul');
    suggestions.innerHTML = '';

    if (results.length > 0) {
      results.forEach((element, index) => {
        // Match word from start
        const match = element.name.match(new RegExp('^' + inputVal, 'i'));
        if (match) {
          suggestions.innerHTML += `<li>${match.input}</li>`;
        }
      });

      suggestions.classList.add('has-suggestions');
      $('#division_suggestion_' + id).show();
      $('#division_loader_' + id).hide();
    } else {
      results = [];

      // If no result remove all <li>
      suggestions.innerHTML = '';
      suggestions.classList.remove('has-suggestions');
      $('#division_suggestion_' + id).hide();
      $('#division_loader_' + id).hide();
    }
  }

  divisionSelection(e, row) {
    const id = (row === -1) ? 'def' : row;
    const suggestions = document.querySelector('#division_suggestion_' + id + ' ul');

    $('#division_' + id).val(e.target.innerText);
    //$('#division_def').focus();

    let results = [];
    results = this.divisions.filter(function (d) {
      return d.name.toLowerCase().indexOf(e.target.innerText.toLowerCase()) > -1;
    });

    if (results.length > 1) {
      console.log('...More then one division...', results);
      $('#division_id_' + id).val('');
      $('#plant_id_' + id).val('');
    } else {
      $('#division_id_' + id).val(results[0].division);
      $('#plant_id_' + id).val(results[0].plant);
    }

    suggestions.innerHTML = '';
    suggestions.classList.remove('has-suggestions');
    $('#division_suggestion_' + id).hide();
    $('#product_'+ id).focus();
  }
  /***** EOF Division key-up functionality *****/


  /***** Product key-up functionality *****/
  searchProduct(e, i) {
    const id = (i === -1) ? 'def' : i;
    const inputVal = e.currentTarget.value;

    $('#product_id_' + id).val('');
    $('#batch_' + id).val('');
    $('#mrp_' + id).val(Number(0).toFixed(2));
    $('#pts_' + id).val(Number(0).toFixed(2));
    $('#billingRate_' + id).val('');

    this.changeCalculation(e, i);

    if (inputVal.length) {
      $('#product_loader_' + id).show();

      let results: any = [];
      results = this.matchProduct(inputVal, i);

      this.delay(10).then(any => {
        this.productSuggestions(results, inputVal, i);
      });
    } else {
      $('#product_suggestion_' + id).hide();
    }
  }

  matchProduct(str, i) {
    const id = (i === -1) ? 'def' : i;
    const val = str.toLowerCase();
    const plantId = $('#plant_id_' + id).val();
    const divisionId = $('#division_id_' + id).val();

    let results = [];

    results = this.products.filter(element => {
      return element.materialName.toLowerCase().indexOf(val) > -1 &&
        element.division === Number(divisionId); /*  && 
            element.plant === Number(plantId); */
    });

    return results;
  }

  productSuggestions(results, inputVal, row) {
    const id = (row === -1) ? 'def' : row;

    const suggestions = document.querySelector('#product_suggestion_' + id + ' ul');
    suggestions.innerHTML = '';

    if (results.length > 0) {
      results.forEach((element, index) => {
        // Match word from start
        const match = element.materialName.match(new RegExp('^' + inputVal, 'i'));
        if (match) {
          suggestions.innerHTML += `<li>${match.input}</li>`;
        }
      });

      suggestions.classList.add('has-suggestions');
      $('#product_suggestion_' + id).show();

      $('#product_loader_' + id).hide();
    } else {
      results = [];

      // If no result remove all <li>
      suggestions.innerHTML = '';
      suggestions.classList.remove('has-suggestions');
      $('#product_suggestion_' + id).hide();

      $('#product_loader_' + id).hide();
    }
  }

  productSelection(e, row) {
    let results = [];
    const id = (row === -1) ? 'def' : row;

    results = this.products.filter(function (d) {
      //return d.materialName.toLowerCase().indexOf(e.target.innerText.toLowerCase()) > -1;
      return d.materialName.toLowerCase() === e.target.innerText.toLowerCase()
    });

    let material = '';
    if (results.length > 1) {
      results.forEach((element, index) => {
        if (index + 1 == results.length) {
          material += element.material;
        } else {
          material += element.material + ',';
        }
      });
    } else {
      material = results[0].material;
    }

    const suggestions = document.querySelector('#product_suggestion_' + id + ' ul');
    suggestions.innerHTML = '';
    suggestions.classList.remove('has-suggestions');

    $('#product_' + id).val(e.target.innerText);
    $('#product_id_' + id).val(material);

    /* if (results.length > 1) {
      console.log('...More then one product...', results);
      $('#product_' + id).val('');
      $('#product_id_' + id).val('');
    } else {
      const suggestions = document.querySelector('#product_suggestion_' + id + ' ul');
      suggestions.innerHTML = '';
      suggestions.classList.remove('has-suggestions');

      $('#product_' + id).val(e.target.innerText);
      $('#product_id_' + id).val(results[0].material);
    } */

    $('#product_suggestion_' + id).hide();
    $('#batch_' + id).focus();
  }
  /***** EOF Product key-up functionality *****/


  /***** Batch key-up functionality *****/
  searchBatch(e, i) {
    const id = (i === -1) ? 'def' : i;
    const inputVal = e.currentTarget.value;

    $('#mrp_' + id).val(Number(0).toFixed(2));
    $('#pts_' + id).val(Number(0).toFixed(2));
    $('#billingRate_' + id).val('');

    this.changeCalculation(e, i);

    if (inputVal.length) {
      $('#batch_loader_' + id).show();
      let results: any = [];
      results = this.matchBatch(inputVal, i);

      this.delay(10).then(any => {
        this.batchSuggestions(results, inputVal, i);
      });
    } else {
      $('#batch_suggestion_' + id).hide();
    }
  }

  matchBatch(str, i) {
    const id = (i === -1) ? 'def' : i;
    const val = str.toLowerCase();
    const divisionId = $('#division_id_' + id).val();
    const productId = $('#product_id_' + id).val();
    const plantId = $('#plant_id_' + id).val();
    const explodeProductId = productId.split(",");

    let results = [];
    explodeProductId.forEach(element => {
      let result = [];
      result = this.batches.filter(element2 => {
        return element2.material === Number(element) &&
          element2.division === Number(divisionId) &&
          element2.batch.toLowerCase().indexOf(val) > -1;
      });

      if (result.length) {
        results.push(result);
      }
    });
    console.log('results--', results);

    /* results = this.batches.filter(element => {
      return element.material === Number(productId) &&
        element.division === Number(divisionId) &&
        //element.plant === Number(plantId) &&
        element.batch.toLowerCase().indexOf(val) > -1;
    }); */

    return results;
  }

  batchSuggestions(results, inputVal, row) {
    const id = (row === -1) ? 'def' : row;

    const suggestions = document.querySelector('#batch_suggestion_' + id + ' ul');
    suggestions.innerHTML = '';

    if (results.length > 0) {
      results.forEach((element, index) => {
        element.forEach(element2 => {
          // Match word from start
          const match = element2.batch.match(new RegExp('^' + inputVal, 'i'));
          if (match) {
            suggestions.innerHTML += `<li>${match.input}</li>`;
          }
        });
      });
      
      suggestions.classList.add('has-suggestions');
      $('#batch_suggestion_' + id).show();

      $('#batch_loader_' + id).hide();
    } else {
      results = [];

      // If no result remove all <li>
      suggestions.innerHTML = '';
      suggestions.classList.remove('has-suggestions');
      
      $('#batch_suggestion_' + id).hide();
      $('#batch_loader_' + id).hide();
    }
  }

  batchSelection(e, row) {
    const rowId = (row === -1) ? 'def' : row;
    const suggestions = document.querySelector('#batch_suggestion_' + rowId + ' ul');

    $('#batch_' + rowId).val(e.target.innerText);

    suggestions.innerHTML = '';
    suggestions.classList.remove('has-suggestions');

    $('#batch_suggestion_' + rowId).hide();

    const filtered = this.batches.filter((emp) => emp.batch === e.target.innerText);
    const mrp = (filtered.length) ? filtered[0].mrp : 0;
    const pts = (filtered.length) ? filtered[0].pts : 0;
    const ptr = (filtered.length) ? filtered[0].ptr : 0;
    const ptd = (filtered.length) ? filtered[0].ptd : 0;
    const material = (filtered.length) ? filtered[0].material : '';

    $('#product_id_' + rowId).val(material);
    $('#mrp_' + rowId).val(mrp.toFixed(2));
    $('#pts_' + rowId).val(pts.toFixed(2));
    $('#ptr_' + rowId).val(ptr.toFixed(2));
    $('#ptd_' + rowId).val(ptd.toFixed(2));

    $('#billingRate_' + rowId).focus();
  }
  /***** EOF Batch key-up functionality *****/
  changeCalculation(e, row) {
    const rowId = (row === -1) ? 'def' : row;

    $('#freeQuantity_' + rowId).attr('readonly', false);

    $('#billingRate_' + rowId).removeClass('grf-invalid');
    $('#freeQuantity_' + rowId).removeClass('grf-invalid');
    $('#saleQuantity_' + rowId).removeClass('grf-invalid');

    const billingRate = $('#billingRate_' + rowId).val();
    const freeQuantity = $('#freeQuantity_' + rowId).val();
    const saleQuantity = $('#saleQuantity_' + rowId).val();

    const reg = /^\d*\.?\d*$/;    // RegEx for number and decimal value
    if (!reg.test(billingRate)) $('#billingRate_' + rowId).addClass('grf-invalid');
    if (!reg.test(freeQuantity)) $('#freeQuantity_' + rowId).addClass('grf-invalid');
    if (!reg.test(saleQuantity)) $('#saleQuantity_' + rowId).addClass('grf-invalid');

    if (billingRate == 0) {
      $('#margin_' + rowId).val(0);

      if (freeQuantity) {
        const pts = $('#pts_' + rowId).val();
        const difference = pts - billingRate;
        const totalDifference = difference + (billingRate * 10 / 100);
        const amount = pts * freeQuantity;

        $('#difference_' + rowId).val(difference.toFixed(2));
        $('#totalDifference_' + rowId).val(totalDifference.toFixed(2));
        $('#amount_' + rowId).val(amount.toFixed(2));
      } else {
        $('#difference_' + rowId).val(Number(0).toFixed(2));
        $('#totalDifference_' + rowId).val(Number(0).toFixed(2));
        $('#amount_' + rowId).val(Number(0).toFixed(2));
      }
    } else {
      $('#margin_' + rowId).val(10);
      $('#freeQuantity_' + rowId).val('');
      $('#freeQuantity_' + rowId).attr('readonly', true);

      if (billingRate && saleQuantity) {
        const pts = $('#pts_' + rowId).val();
        const difference = pts - billingRate;
        const totalDifference = difference + (billingRate * 10 / 100);
        const amount = totalDifference * saleQuantity;

        $('#difference_' + rowId).val(difference.toFixed(2));
        $('#totalDifference_' + rowId).val(totalDifference.toFixed(2));
        $('#amount_' + rowId).val(amount.toFixed(2));
      }
    }
  }

  validateMonth() {
    $('#err_month').hide();

    const selectedYear = $("#year option:selected").val();
    const selectedMonth = $("#month option:selected").val();

    if ((selectedMonth > this.currentMonth) && (selectedYear >= this.currentYear)) {
      $('#err_month').text('You can\'t claim for this month.').show();
    }
  }

  getDistributors() {
    this.apiService.fetch('/api/distributor/getDistributor9000').subscribe((response: any) => {
      if (response.status === 200) {
        if (response.data.length) {
          // Getting a unique distributor
          const map = new Map();
          for (const item of response.data) {
            if (!map.has(item.plant)) {
              map.set(item.plant, true);
              this.distributors.push({
                plant: item.plant,
                organization: item.organization
              });
            }
          }
          // EOF Getting a unique distributor
        }
      }
    });
  }

  getUserDistStockistDivision() {
    this.apiService.get('/api/user/getDistStockistDivision', this.sessionData.id).subscribe((response: any) => {
      if (response.status === 200) {
        if (response.data) {
          response.data.forEach(element => {
            // get user's distributor
            const result = this.distributors.filter(element2 => {
              return element.plant === element2.plant;
            });
            this.userDistributors.push(result[0]);
            // EOF get user's distributor

            // get user's stockist plant wise
            this.userPlantStockists[element.plant] = element.stockists;

            // get user's division plant wise
            this.userPlantDivisions[element.plant] = element.divisions;

            this.getData();
          });
        }
      }
    });
  }

  getStockistDistDivision() {
    this.apiService.get('/api/user/getStockistDistDivision', this.sessionData.id).subscribe((response: any) => {
      if (response.status === 200) {
        if (response.data) {
          response.data.forEach(element => {
            // get user's distributor
            const result = this.distributors.filter(element2 => {
              return element.plant === element2.plant;
            });
            this.userDistributors.push(result[0]);
            // EOF get user's distributor

            // get user's stockist plant wise
            this.userPlantStockists[element.plant] = element.customerId;

            // get user's division plant wise
            this.userPlantDivisions[element.plant] = element.divisions;

            this.getData();
          });
        }
      }
    });
  }

  getDivisions() { // 872
    let division = [];
    this.divisions = [];
    const distributor = $("#distributor option:selected").val();
    const dvision = this.userPlantDivisions[distributor];
    dvision.forEach(element => {
      division.push(Number(element));
    });

    this.apiService.post('/api/getDivision', division).subscribe((response: any) => {
      if (response.status === 200) {
        if (response.data.length) {
          this.divisions = response.data;
        }
      }
    });
  }

  getStockiest() {
    let stockists = [];
    const distributor = $("#distributor option:selected").val();
    const stockist = this.userPlantStockists[distributor];

    if (JSON.parse(this.sessionData).type === 'ho' || JSON.parse(this.sessionData).type === 'field') {
      stockist.forEach(element => {
        stockists.push(Number(element));
      });
    } else if (JSON.parse(this.sessionData).type === 'stockist') {
      stockists.push(Number(stockist));
    }

    this.getDivisions();

    this.apiService.post('/api/getStockiest', stockists).subscribe((response: any) => {
      if (response.status === 200) {
        if (response.data.length) {
          this.stockiests = response.data;

          this.delay(5).then(any => {
            $("#stockiest").val($("#stockiest option:eq(1)").val());
            $('#stockiest_loader').hide();
            $('#stockiest').show();
          });
        }
      }
    });
  }

  getStockiest2(distributor, stockiest) {
    let stockists = [];
    const stockist = this.userPlantStockists[distributor];

    if (this.sessionData.type === 'ho' || this.sessionData.type === 'field') {
      stockist.forEach(element => {
        stockists.push(Number(element));
      });
    } else if (this.sessionData.type === 'stockist') {
      stockists.push(Number(stockist));
    }

    this.apiService.post('/api/getStockiest', stockists).subscribe((response: any) => {
      if (response.status === 200) {
        if (response.data.length) {
          this.stockiests = response.data;

          this.delay(5).then(any => {
            $("#stockiest").val(stockiest);
            $('#stockiest_loader').hide();
            $('#stockiest').show();
          });
        }
      }
    });
  }

  getBatch() {
    this.apiService.fetch('/api/batch/all').subscribe((response: any) => {
      if (response.status === 200) {
        if (response.data.length) {
          this.batches = response.data;
        }
      }
    });
  }

  getProduct() {
    this.apiService.fetch('/api/product/all').subscribe((response: any) => {
      if (response.status === 200) {
        if (response.data.length) {
          this.products = response.data;
        }
      }
    });
  }

  getBatchDivision(division, rowId) {
    this.apiService.get('/api/division', division).subscribe((response: any) => {
      if (response.status === 200) {
        if (response.data) {
          $('#division_' + rowId).val(response.data.name);
        }
      }
    });
  }

  getBatchProduct(material, rowId) {
    this.apiService.get('/api/product', material).subscribe((response: any) => {
      if (response.status === 200) {
        if (response.data) {
          $('#product_' + rowId).val(response.data.materialName);
        }
      }
    });
  }

  onSubmit() {
    $('.grf-def').removeClass('grf-invalid');
    $('.grf-am').removeClass('grf-invalid');

    this.btnLoader = true;
    let error = false;
    let totalRows = $(".count").last().val();
    if (totalRows == undefined) totalRows = -1;

    // Stockiest validation
    $('#err_stockiest').hide();
    $('#stockiest').removeClass('grf-invalid');
    if (!$("#stockiest option:selected").val()) {
      error = true;
      $('#stockiest').addClass('grf-invalid');
      $('#err_stockiest').text('Stockiest is required..').show();
    }
    // EOF Stockiest validation


    // Month validation
    $('#err_month').hide();
    $('#month').removeClass('grf-invalid');
    const selectedYear = $("#year option:selected").val();
    const selectedMonth = $("#month option:selected").val();
    if ((selectedMonth > this.currentMonth) && (selectedYear >= this.currentYear)) {
      error = true;
      $('#month').addClass('grf-invalid');
      $('#err_month').text('You can\'t claim for this month.').show();
    }
    // EOF Month validation

    const distributor = $("#distributor option:selected").val();
    const stockiest = $("#stockiest option:selected").val();
    const claimType = $("#type option:selected").val();
    const ClaimMonth = $("#month option:selected").val();
    const claimYear = $("#year option:selected").val();

    for (let row = -1; row <= totalRows; row++) {
      const reg = /^\d*\.?\d*$/;    // RegEx for number and decimal value
      const rowId = (row === -1) ? 'def' : row;

      const header = distributor + '.::.' + stockiest + '.::.' + claimType + '.::.' + ClaimMonth + '.::.' + claimYear + '.::.' + this.sessionData.id;
      const invoice = $('#invoice_' + rowId).val();
      const batch = $('#batch_' + rowId).val();
      const division = $('#division_' + rowId).val();
      const divisionId = $('#division_id_' + rowId).val();
      const product = $('#product_' + rowId).val();
      const productId = $('#product_id_' + rowId).val();
      const mrp = $('#mrp_' + rowId).val();
      const pts = $('#pts_' + rowId).val();
      const ptr = $('#ptr_' + rowId).val();
      const ptd = $('#ptd_' + rowId).val();
      const billingRate = $('#billingRate_' + rowId).val();
      //const margin = $('#margin_' + rowId).val();
      const freeQuantity = $('#freeQuantity_' + rowId).val();
      const saleQuantity = $('#saleQuantity_' + rowId).val();
      const difference = $('#difference_' + rowId).val();
      const totalDifference = $('#totalDifference_' + rowId).val();
      const amount = $('#amount_' + rowId).val();

      if (!invoice) {
        error = true;
        $('#invoice_' + rowId).addClass('grf-invalid');
      }

      if (!batch) {
        error = true;
        $('#batch_' + rowId).addClass('grf-invalid');
      }

      if (!product) {
        error = true;
        $('#product_' + rowId).addClass('grf-invalid');
      }

      if (!billingRate) {
        error = true;
        $('#billingRate_' + rowId).addClass('grf-invalid');
      }

      if (!reg.test(billingRate)) {
        error = true;
        $('#billingRate_' + rowId).addClass('grf-invalid');
      }

      if (!reg.test(freeQuantity)) {
        error = true;
        $('#freeQuantity_' + rowId).addClass('grf-invalid');
      }

      if (!reg.test(saleQuantity)) {
        error = true;
        $('#saleQuantity_' + rowId).addClass('grf-invalid');
      }

      if (billingRate && !freeQuantity && !saleQuantity) {
        error = true;
        $('#freeQuantity_' + rowId).addClass('grf-invalid');
        $('#saleQuantity_' + rowId).addClass('grf-invalid');
      }

      if (amount <= 0) {
        error = true;
        $('#amount_' + rowId).addClass('grf-invalid');
      }

      if (error) {
        this.btnLoader = false;
        this.toast('error', 'Something went wrong, fix it from the original record or delete the row with the error.');
        return false;
      }

      // Binding form field and value
      if (row === -1) {
        let fname = '';
        if (this.newFiles && this.newFiles.length) {
          this.newFiles.forEach((element) => {
            if (element.length) {
              element.forEach((ele) => {
                fname = fname + ele.filename + '.::.';
              });
            }
          });
        }

        this.claimForm.value.def_image = fname;
        this.claimForm.value.def_invoice = invoice;
        this.claimForm.value.def_batch = batch;
        this.claimForm.value.def_divisionId = divisionId;
        this.claimForm.value.def_division = division;
        this.claimForm.value.def_product = product;
        this.claimForm.value.def_productId = productId;
        this.claimForm.value.def_mrp = mrp;
        this.claimForm.value.def_pts = pts;
        this.claimForm.value.def_ptr = ptr;
        this.claimForm.value.def_ptd = ptd;
        this.claimForm.value.def_billingRate = billingRate;
        //this.claimForm.value.def_margin = margin;
        this.claimForm.value.def_freeQuantity = freeQuantity;
        this.claimForm.value.def_saleQuantity = saleQuantity;
        this.claimForm.value.def_difference = difference;
        this.claimForm.value.def_totalDifference = totalDifference;
        this.claimForm.value.def_amount = amount;
        this.claimForm.value.header = header;
        this.claimForm.value.id = this.selectedClaim;
      } else {
        let fname = '';
        if (this.fileNames[row] && this.fileNames[row].length) {
          this.fileNames[row].forEach((element, index) => {
            fname = fname + element.filename + '.::.';
          });
        }
        this.claimForm.value.claims[row].image = fname;
        this.claimForm.value.claims[row].invoice = invoice;
        this.claimForm.value.claims[row].batch = batch;
        this.claimForm.value.claims[row].divisionId = divisionId;
        this.claimForm.value.claims[row].division = division;
        this.claimForm.value.claims[row].product = product;
        this.claimForm.value.claims[row].productId = productId;
        this.claimForm.value.claims[row].mrp = mrp;
        this.claimForm.value.claims[row].pts = pts;
        this.claimForm.value.claims[row].ptr = ptr;
        this.claimForm.value.claims[row].ptd = ptd;
        this.claimForm.value.claims[row].billingRate = billingRate;
        //this.claimForm.value.claims[row].margin = margin;
        this.claimForm.value.claims[row].freeQuantity = freeQuantity;
        this.claimForm.value.claims[row].saleQuantity = saleQuantity;
        this.claimForm.value.claims[row].difference = difference;
        this.claimForm.value.claims[row].totalDifference = totalDifference;
        this.claimForm.value.claims[row].amount = amount;
        this.claimForm.value.claims[row].header = header;
      }
    }

    this.apiService.post('/api/claim/update', this.claimForm.value).subscribe((response: any) => {
      if (response.status === 200) {
        this.toast('success', 'Successfully saved in draft.');
        this.router.navigateByUrl('/stockiest/draftClaim');
        
        /* setTimeout(() => {
          window.location.reload();
        }, 5000); */
      }
    });
  }

  getData() {
    this.apiService.get('/api/getClaim', this.selectedClaim).subscribe((response: any) => {
      if (response.status === 200) {
        if (response.data.length) {
          this.records = response.data[0];

          $("#distributor").val(this.records.plant);
          $('#distributor_loader').hide();
          $('#distributor').show();

          this.getStockiest2(this.records.plant, this.records.customerId);

          $('#type').val(this.records.claimType);
          $('#month').val(this.records.claimMonth);
          $('#year').val(this.records.claimYear);

          this.getDivisions();

          this.claimForm.controls['def_invoice'].setValue(this.records.invoice, { onlySelf: true });
          this.claimForm.value.def_invoice = this.records.invoice;

          this.claimForm.controls['def_batch'].setValue(this.records.batch, { onlySelf: true });
          this.claimForm.value.def_batch = this.records.batch;

          this.claimForm.controls['def_divisionId'].setValue(this.records.divisionId, { onlySelf: true });
          this.claimForm.value.def_division = this.records.divisionId;

          this.claimForm.controls['def_division'].setValue(this.records.divisionName, { onlySelf: true });
          this.claimForm.value.def_division = this.records.divisionName;

          this.claimForm.controls['def_product'].setValue(this.records.materialName, { onlySelf: true });
          this.claimForm.value.def_product = this.records.materialName;

          this.claimForm.controls['def_productId'].setValue(this.records.material, { onlySelf: true });
          this.claimForm.value.def_productId = this.records.material;

          this.claimForm.controls['def_particulars'].setValue(this.records.particulars, { onlySelf: true });
          this.claimForm.value.def_particulars = this.records.particulars;

          this.claimForm.controls['def_mrp'].setValue(this.records.mrp, { onlySelf: true });
          this.claimForm.value.def_mrp = this.records.mrp;

          this.claimForm.controls['def_pts'].setValue(this.records.pts, { onlySelf: true });
          this.claimForm.value.def_pts = this.records.pts;

          this.claimForm.controls['def_billingRate'].setValue(this.records.billingRate, { onlySelf: true });
          this.claimForm.value.def_billingRate = this.records.billingRate;

          // this.claimForm.controls['def_margin'].setValue(this.records.margin, { onlySelf: true });
          // this.claimForm.value.def_margin = this.records.margin;

          this.claimForm.controls['def_freeQuantity'].setValue(this.records.freeQuantity, { onlySelf: true });
          this.claimForm.value.def_freeQuantity = this.records.freeQuantity;

          this.claimForm.controls['def_saleQuantity'].setValue(this.records.saleQuantity, { onlySelf: true });
          this.claimForm.value.def_saleQuantity = this.records.saleQuantity;

          this.claimForm.controls['def_difference'].setValue(this.records.difference, { onlySelf: true });
          this.claimForm.value.def_difference = this.records.difference;

          this.claimForm.controls['def_totalDifference'].setValue(this.records.totalDifference, { onlySelf: true });
          this.claimForm.value.def_totalDifference = this.records.totalDifference;

          this.claimForm.controls['def_amount'].setValue(this.records.amount, { onlySelf: true });
          this.claimForm.value.def_amount = this.records.amount;

          if (this.records.files.length) {
            let oldFilename = [];
            this.records.files.forEach(element => {
              const file = {
                filename: element.filename,
                originalname: element.originalFilename
              }
              oldFilename.push(file);
            });
            this.fileNames[-1] = oldFilename;
          }

        } else {
          this.toast('error', response.message);
        }
      } else {
        this.toast('error', response.message);
      }
    });
  }

  errorHandling(error: any) {
    try {
      // this.isLoading = false;
      const errorObj = error ? JSON.parse(error) : '';
      //this.toastr.error(errorObj.message, 'Error');
    } catch (error) {
      //this.toastr.error(error.message, 'Error');
    }
  }

  openWebcam(event, row, content) {
    const rowId = (row === -1) ? 'def' : row;
    this.showWebcam = true;
    this.selectedwebcamrow = rowId;
    this.modalService.open(content, {
      size: 'lg'
    }).result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
      this.showWebcam = false;
      this.webcamImage = null;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
      this.showWebcam = false;
      this.webcamImage = null;
    });
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }


}
