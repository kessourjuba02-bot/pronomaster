import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { ShellComponent } from './app/shell.component';
import { config } from './app/app.config.server';

const bootstrap = (context: BootstrapContext) =>
    bootstrapApplication(ShellComponent, config, context);

export default bootstrap;
