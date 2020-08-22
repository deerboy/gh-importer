import { ApolloService } from './../services/apollo.service';
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit {
  token = new FormControl();

  constructor(public apolloService: ApolloService) {}

  ngOnInit(): void {}
}
