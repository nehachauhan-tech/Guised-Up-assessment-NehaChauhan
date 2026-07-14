<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Create test users
        User::create([
            'username' => 'user1',
            'email' => 'user1@guised.up',
            'password' => Hash::make('password')
        ]);

        User::create([
            'username' => 'user2',
            'email' => 'user2@guised.up',
            'password' => Hash::make('password')
        ]);

        User::create([
            'username' => 'user3',
            'email' => 'user3@guised.up',
            'password' => Hash::make('password')
        ]);
    }
}
