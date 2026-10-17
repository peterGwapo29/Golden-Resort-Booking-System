<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminEmail = env('ADMIN_DEFAULT_EMAIL', 'admin@goldenresort.com');
        $adminPassword = env('ADMIN_DEFAULT_PASSWORD', 'Password123!');

        User::updateOrCreate(
            ['email' => $adminEmail],
            [
                'name' => 'Golden Resort Admin',
                'password' => Hash::make($adminPassword),
                'role' => 'admin',
                'email_verified_at' => now(),
            ]
        );
    }
}
