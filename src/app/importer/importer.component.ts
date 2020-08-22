import { Component, OnInit } from '@angular/core';
import { Repository } from 'src/app/interfaces/repository';
import { RepositoryService } from 'src/app/services/repository.service';
import { ApolloService } from 'src/app/services/apollo.service';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-importer',
  templateUrl: './importer.component.html',
  styleUrls: ['./importer.component.scss'],
})
export class ImporterComponent implements OnInit {
  processing: boolean;
  newRepository: Repository;
  form = this.fb.group({
    template: [
      '',
      [Validators.required, Validators.pattern(/^[^\/]+\/[^\/]+$/)],
    ],
    newRepository: [
      '',
      [Validators.required, Validators.pattern(/^[^\/]+\/[^\/]+$/)],
    ],
    filter: [['source', 'issue', 'label']],
  });

  constructor(
    private fb: FormBuilder,
    public apolloService: ApolloService,
    private repositoryService: RepositoryService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {}

  import() {
    this.processing = true;
    this.snackBar.open('インポート中...', null, {
      duration: null,
    });
    this.repositoryService
      .importAll(this.form.value)
      .then((repository: Repository) => {
        this.newRepository = repository;
        this.snackBar.open('インポート成功');
      })
      .catch((error) => {
        if (error.target) {
          this.form.get(error.target).setErrors({
            [error.type]: true,
          });
        }
        console.error(error.message);
        this.snackBar.open('インポート失敗');
      })
      .finally(() => {
        this.processing = false;
      });
  }

  get source(): boolean {
    return this.form.get('filter').value.includes('source');
  }
}
