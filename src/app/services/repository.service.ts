import { Repository } from './../interfaces/repository';
import { Label } from './../interfaces/label';
import { Issue } from './../interfaces/issue';
import { Injectable } from '@angular/core';
import {
  GetRepositoryGQL,
  ImportRepositoryGQL,
  GetUserGQL,
  GetIssuesGQL,
  GetLabelsGQL,
  CreateIssueGQL,
  CreateLabelGQL,
  DeleteLabelGQL,
  CreateRepositoryGQL,
} from './../../generated/graphql';

interface RepositoryOptions {
  owner: string;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class RepositoryService {
  constructor(
    private getUserGQL: GetUserGQL,
    private getRepositoryGQL: GetRepositoryGQL,
    private importRepositoryGQL: ImportRepositoryGQL,
    private getIssuesGQL: GetIssuesGQL,
    private getLabelsGQL: GetLabelsGQL,
    private createLabelGQL: CreateLabelGQL,
    private createIssueGQL: CreateIssueGQL,
    private deleteLabelGQL: DeleteLabelGQL,
    private createRepositoryGQL: CreateRepositoryGQL
  ) {}

  async importAll(params: {
    template: string;
    newRepository: string;
    filter: ('source' | 'issue' | 'label')[];
  }) {
    const options = this.parsePaths(params);
    const template = await this.getTemplate(options.template);
    const ownerId = await this.getOwnerId(options.newRepository.owner);
    const issues = await this.getIssues(options.template);
    const labels = await this.getLabels(options.template);
    let repository: Repository;

    try {
      repository = await this.getRepository(options.newRepository);
    } catch {
      if (params.filter.includes('source')) {
        repository = await this.importRepository({
          ownerId,
          name: options.newRepository.name,
          repositoryId: template.id,
        });
      } else {
        repository = (
          await this.createRepositoryGQL
            .mutate({
              ownerId,
              name: options.newRepository.name,
            })
            .toPromise()
        ).data.createRepository.repository;
      }
    }

    if (params.filter.includes('label')) {
      await this.deleteLabels(options.newRepository);
      await this.importLabels(repository.id, labels);
    }

    if (params.filter.includes('issue')) {
      await this.importIssues(
        repository.id,
        issues,
        params.filter.includes('label')
          ? await this.getLabels(options.newRepository)
          : null
      );
    }

    return repository;
  }

  private async importLabels(
    repositoryId: string,
    labels: Label[]
  ): Promise<any[]> {
    return Promise.all(
      labels.map(
        (label): Promise<any> => {
          return this.createLabelGQL
            .mutate({
              repositoryId,
              color: label.color,
              name: label.name,
              description: label.description,
            })
            .toPromise();
        }
      )
    );
  }

  private async getRepository(options: RepositoryOptions): Promise<Repository> {
    return (await this.getRepositoryGQL.fetch(options).toPromise()).data
      .repository;
  }

  private async importIssues(
    repositoryId: string,
    issues: Issue[],
    labels: Label[]
  ): Promise<any> {
    return Promise.all(
      issues.map(
        (issue: Issue): Promise<any> => {
          return this.createIssueGQL
            .mutate({
              repositoryId,
              body: issue.body,
              labelIds:
                labels && issue.labelNames.length
                  ? issue.labelNames.map(
                      (name) => labels.find((label) => label.name === name)?.id
                    )
                  : null,
              title: issue.title,
            })
            .toPromise();
        }
      )
    ).catch((error) => {
      console.error(error);
    });
  }

  private async getOwnerId(login: string): Promise<string> {
    try {
      return (await this.getUserGQL.fetch({ login }).toPromise())?.data?.user
        ?.id;
    } catch {
      throw {
        target: 'newRepository',
        type: 'owner',
      };
    }
  }

  private parsePaths(params: {
    template: string;
    newRepository: string;
  }): {
    template: RepositoryOptions;
    newRepository: RepositoryOptions;
  } {
    if (!params.template?.match('/')) {
      throw {
        target: 'template',
        type: 'path',
      };
    }

    if (!params.newRepository?.match('/')) {
      throw {
        target: 'newRepository',
        type: 'path',
      };
    }

    const [templateOwner, templateName] = params.template.split('/');
    const [newRepositoryOwner, newRepositoryName] = params.newRepository.split(
      '/'
    );

    return {
      template: {
        owner: templateOwner,
        name: templateName,
      },
      newRepository: {
        owner: newRepositoryOwner,
        name: newRepositoryName,
      },
    };
  }

  private async getTemplate(options: RepositoryOptions) {
    try {
      const template = (await this.getRepositoryGQL.fetch(options).toPromise())
        ?.data?.repository;

      if (!template?.isTemplate) {
        throw {
          target: 'template',
          type: 'template',
        };
      }

      return template;
    } catch {
      throw {
        target: 'template',
        type: 'request',
      };
    }
  }

  private async deleteLabels(options: RepositoryOptions): Promise<any> {
    const labels = await this.getLabels(options);
    return Promise.all(
      labels.map(
        (label: Label): Promise<any> => {
          return this.deleteLabelGQL
            .mutate({
              id: label.id,
            })
            .toPromise();
        }
      )
    );
  }

  private async importRepository(params: {
    ownerId: string;
    name: string;
    repositoryId: string;
  }): Promise<{
    id: string;
    url: string;
    isTemplate: boolean;
  }> {
    try {
      return (await this.importRepositoryGQL.mutate(params).toPromise())?.data
        ?.cloneTemplateRepository?.repository;
    } catch (error) {
      console.error(error?.message);
      throw {
        target: 'newRepository',
        type: 'import',
      };
    }
  }

  private async getIssues(params: RepositoryOptions): Promise<Issue[]> {
    const issues: Issue[] = [];
    let hasNext = true;
    let cursor: string;

    while (hasNext) {
      const result = await this.getIssuesGQL
        .fetch({
          owner: params.owner,
          name: params.name,
          cursor,
        })
        .toPromise()
        .catch(() => {
          throw new Error('issueの取得に失敗しました');
        });

      const items: Issue[] = result.data?.repository?.issues.edges.map(
        (edge) => {
          const issue: Issue = {
            title: edge.node.title,
            body: edge.node.body,
            labelNames: edge.node.labels.nodes.map((node) => node.name),
          };
          return issue;
        }
      );

      issues.push(...items);
      hasNext = result.data?.repository?.issues?.pageInfo?.hasNextPage;
      cursor = result.data?.repository?.issues?.pageInfo?.endCursor;
    }

    return issues;
  }

  private async getLabels(params: RepositoryOptions): Promise<Label[]> {
    const labels: Label[] = [];
    let hasNext = true;
    let cursor: string;

    while (hasNext) {
      const result = await this.getLabelsGQL
        .fetch({
          ...params,
          cursor,
        })
        .toPromise()
        .catch(() => {
          throw new Error('issueの取得に失敗しました');
        });
      const items: Label[] = result.data?.repository?.labels.edges.map(
        (edge) => {
          const label: Label = {
            id: edge.node.id,
            name: edge.node.name,
            color: edge.node.color,
            description: edge.node.description,
          };
          return label;
        }
      );

      labels.push(...items);
      hasNext = result.data?.repository?.labels?.pageInfo?.hasNextPage;
      cursor = result.data?.repository?.labels?.pageInfo?.endCursor;
    }

    return labels;
  }
}
