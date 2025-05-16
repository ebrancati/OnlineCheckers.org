import {inject, Injectable} from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  if (localStorage.getItem('loggedIn') === 'true') {
    return true;
  } else {
    return true;
    return inject(Router).createUrlTree(['/']);
  }
};
