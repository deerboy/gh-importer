import { ApolloService } from './../services/apollo.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent implements OnInit {
  constructor(public apolloService: ApolloService) {}

  ngOnInit(): void {}
}
