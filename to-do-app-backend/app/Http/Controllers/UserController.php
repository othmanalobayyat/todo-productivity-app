<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
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

        if (Auth::attempt($request->only('email', 'password'))) {
            $user = Auth::user();
            $token = $user->createToken('API Token')->plainTextToken;  // Generate API token

            return response()->json([
                'token' => $token, // Send the token to the client
            ]);
        }

        return response()->json(['message' => 'Invalid credentials'], 401);
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
        // Get the authenticated user
        $user = Auth::user();

        // Return user profile data (you can add more fields as needed)
        return response()->json([
            'name' => $user->name,
            'email' => $user->email,
            // Add other profile information as needed
        ]);
    }
}
