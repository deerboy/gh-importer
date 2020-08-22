import { HttpLink } from 'apollo-angular/http';
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { setContext } from '@apollo/client/link/context';
import { ApolloLink, InMemoryCache } from '@apollo/client/core';

@Injectable({
  providedIn: 'root',
})
export class ApolloService {
  private readonly uri = 'https://api.github.com/graphql';

  constructor(public apollo: Apollo, private httpLink: HttpLink) {
    const token: string = localStorage.getItem('token');
    if (token) {
      this.setClient(token);
    }
  }

  setClient(token: string) {
    if (this.apollo.client) {
      this.apollo.removeClient();
    }

    localStorage.setItem('token', token);

    const basic: ApolloLink = setContext(() => ({
      headers: {
        Accept: 'charset=utf-8',
      },
    }));

    const auth: ApolloLink = setContext(() => ({
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.bane-preview+json',
      },
    }));

    const link: ApolloLink = ApolloLink.from([
      basic,
      auth,
      this.httpLink.create({ uri: this.uri }),
    ]);

    const cache: InMemoryCache = new InMemoryCache();

    this.apollo.create({
      link,
      cache,
      defaultOptions: {
        watchQuery: {
          fetchPolicy: 'network-only',
        },
        query: {
          fetchPolicy: 'network-only',
        },
        mutate: {
          fetchPolicy: 'no-cache',
        },
      },
    });
  }

  removeClient() {
    this.apollo.removeClient();
    localStorage.clear();
  }
}
