import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TurnstileService, TurnstileHandle } from '../../services/turnstile.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-signup',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, MatIconModule],
    templateUrl: './signup.component.html',
    styles: []
})
export class SignupComponent implements OnInit, AfterViewInit {
    @ViewChild('captchaEl') captchaEl?: ElementRef<HTMLElement>;
    private captcha?: TurnstileHandle;

    signupForm: FormGroup;
    loading = false;
    errorMessage = '';
    roles = ['Citizen', 'Ward Member', 'Panchayat Admin', 'Kudumbashree Member', 'Kudumbashree Admin', 'Health Worker', 'Vehicle Owner', 'Shopkeeper', 'Waste Management Staff'];

    // OTP Auth state
    step = 1; // 1 = Enter Details, 2 = Enter OTP
    otpCode = '';

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private turnstile: TurnstileService,
        private router: Router
    ) {
        this.signupForm = this.fb.group({
            full_name: ['', Validators.required],
            mobile_number: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
            email: ['', Validators.email],
            role: ['Citizen', Validators.required],
            ward_number: [''],
            panchayat_name: [''],
            address: [''],
            house_number: [''],
            aadhaar_number: [''],
            password: ['', Validators.required],
            confirm_password: ['', Validators.required],
            profile_image: ['']
        });
    }

    onSubmit() {
        if (this.signupForm.valid) {
            this.sendOtp();
        }
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                this.signupForm.patchValue({
                    profile_image: reader.result
                });
            };
            reader.readAsDataURL(file);
        }
    }

    ngOnInit() {}

    ngAfterViewInit() {
        this.renderCaptcha();
    }

    private renderCaptcha() {
        if (this.captchaEl && this.turnstile.enabled && !this.captcha) {
            this.turnstile.render(this.captchaEl.nativeElement)
                .then((h) => (this.captcha = h))
                .catch(() => (this.errorMessage = 'Could not load the CAPTCHA. Refresh and try again.'));
        }
    }

    private backToStep1() {
        this.step = 1;
        this.captcha = undefined;
        setTimeout(() => this.renderCaptcha(), 50);
    }

    sendOtp() {
        if (this.signupForm.invalid) return;

        if (this.signupForm.value.password !== this.signupForm.value.confirm_password) {
            this.errorMessage = "Passwords don't match";
            return;
        }

        const captchaToken = this.captcha?.getResponse() || '';
        if (this.turnstile.enabled && !captchaToken) {
            this.errorMessage = 'Please complete the CAPTCHA.';
            return;
        }

        this.loading = true;
        this.errorMessage = '';

        let phone = this.signupForm.value.mobile_number;
        // Strip +91 if it exists so backend gets clean 10-digit number
        if (phone.startsWith('+91')) {
            phone = phone.replace('+91', '');
        }

        this.authService.sendOtp(phone, captchaToken).subscribe({
            next: (response) => {
                this.step = 2; // Move to OTP entry screen
                this.loading = false;
                // Auto-fill OTP if backend returns it (no SMS provider configured)
                if (response.dev_otp) {
                    this.otpCode = response.dev_otp;
                }
            },
            error: (err) => {
                this.errorMessage = err.error?.message || 'Failed to send OTP. Try again.';
                this.loading = false;
                this.captcha?.reset(); // token is single-use
            }
        });
    }

    verifyOtpAndSignup() {
        if (!this.otpCode || this.otpCode.length < 6) {
            this.errorMessage = 'Please enter a valid 6-digit OTP';
            return;
        }

        this.loading = true;
        this.errorMessage = '';

        // Add the OTP code to the signup form payload
        const signupData = {
            ...this.signupForm.value,
            otp: this.otpCode
        };

        this.authService.signup(signupData).subscribe({
            next: () => {
                this.router.navigate(['/login']);
            },
            error: (err) => {
                this.loading = false;
                this.errorMessage = err.error?.message || 'Signup failed on the server or invalid OTP';
                if(err.status >= 500) {
                     this.backToStep1(); // Go back in case they need to fix form details
                }
            }
        });
    }
}
