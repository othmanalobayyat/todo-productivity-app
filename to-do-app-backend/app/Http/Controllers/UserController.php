<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Models\User;

class UserController extends Controller
{
    public function register(Request $request)
    {
        try {
            $request->validate([
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
                'password' => ['required', 'string', 'min:8'],
            ]);

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
            ]);

            $token = $user->createToken('API Token')->plainTextToken;

            return response()->json([
                'token' => $token,
                'user' => $user,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Custom response for validation errors
            $errors = $e->validator->errors();

            if ($errors->has('email')) {
                return response()->json([
                    'message' => 'The email address is already in use.',
                ], 409);
            }

            return response()->json([
                'message' => 'Validation error.',
                'errors' => $errors->messages(),
            ], 422);
        }
    }

    public function token(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $request->email)->first();

        // Node.js bcrypt uses $2b$ prefix; PHP expects $2y$. They are identical algorithms.
        $hash = $user ? str_replace('$2b$', '$2y$', $user->password) : '';

        if (!$user || !password_verify($request->password, $hash)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $token = $user->createToken('API Token')->plainTextToken;

        return response()->json(['token' => $token]);
    }
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    /**
     * Fetch user profile data.
     */
    public function profile(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'name'  => $user->name,
            'email' => $user->email,
        ]);
    }

    /**
     * Update the authenticated user's name and email.
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        try {
            $request->validate([
                'name'  => ['required', 'string', 'max:255'],
                'email' => [
                    'required', 'string', 'email', 'max:255',
                    Rule::unique('users')->ignore($user->id),
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            $errors = $e->validator->errors();

            if ($errors->has('email')) {
                return response()->json([
                    'message' => 'That email address is already in use.',
                ], 409);
            }

            return response()->json([
                'message' => 'Validation error.',
                'errors'  => $errors->messages(),
            ], 422);
        }

        $user->update([
            'name'  => $request->name,
            'email' => $request->email,
        ]);

        return response()->json([
            'name'  => $user->name,
            'email' => $user->email,
        ]);
    }
}
