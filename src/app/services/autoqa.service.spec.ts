import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AutoQaService } from './autoqa.service';
import { environment } from '../enviroment/enviroment.prd';

describe('AutoQaService', () => {
  let service: AutoQaService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/api/auto-qa`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AutoQaService, provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(AutoQaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve chamar endpoint de seleção de pasta', () => {
    const expected = { selected: true, cancelled: false, projectPath: '/tmp/projeto', validation: null };
    service.selectProjectFolder().subscribe((resp) => {
      expect(resp).toEqual(expected);
    });

    const req = httpMock.expectOne(`${baseUrl}/project/select-folder`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(expected);
  });
});
