"use client";

import React, { useMemo } from "react";
import { Check, X, AlertTriangle } from "lucide-react";

export type PasswordStrengthLevel = "weak" | "medium" | "strong";

interface PasswordStrengthCheck {
  label: string;
  passed: boolean;
  required: boolean;
}

interface PasswordStrengthProps {
  password: string;
  onStrengthChange?: (strength: PasswordStrengthLevel) => void;
  showRequirements?: boolean;
  className?: string;
}

const calculatePasswordStrength = (
  password: string,
): {
  strength: PasswordStrengthLevel;
  score: number;
  checks: PasswordStrengthCheck[];
} => {
  const checks: PasswordStrengthCheck[] = [
    {
      label: "At least 8 characters",
      passed: password.length >= 8,
      required: true,
    },
    {
      label: "Contains lowercase letter",
      passed: /[a-z]/.test(password),
      required: true,
    },
    {
      label: "Contains uppercase letter",
      passed: /[A-Z]/.test(password),
      required: true,
    },
    {
      label: "Contains number",
      passed: /[0-9]/.test(password),
      required: true,
    },
    {
      label: "Contains special character",
      passed: /[^A-Za-z0-9]/.test(password),
      required: false,
    },
    {
      label: "At least 12 characters",
      passed: password.length >= 12,
      required: false,
    },
    {
      label: "No repeated characters",
      passed: !/(.)\1{2,}/.test(password),
      required: false,
    },
    {
      label: "No common patterns",
      passed: !/123|abc|qwe|password|admin/i.test(password),
      required: false,
    },
  ];

  // Calculate score
  let score = 0;
  checks.forEach((check) => {
    if (check.passed) {
      score += check.required ? 2 : 1;
    }
  });

  // Determine strength based on score and required checks
  const requiredPassed = checks.filter((c) => c.required && c.passed).length;
  const totalRequired = checks.filter((c) => c.required).length;

  let strength: PasswordStrengthLevel;
  if (requiredPassed < totalRequired) {
    strength = "weak";
  } else if (score <= 6) {
    strength = "medium";
  } else {
    strength = "strong";
  }

  return { strength, score, checks };
};

const PasswordStrength: React.FC<PasswordStrengthProps> = ({
  password,
  onStrengthChange,
  showRequirements = true,
  className = "",
}) => {
  const analysis = useMemo(() => {
    const result = calculatePasswordStrength(password);

    // Notify parent of strength change
    if (onStrengthChange) {
      onStrengthChange(result.strength);
    }

    return result;
  }, [password, onStrengthChange]);

  const getStrengthColor = (strength: PasswordStrengthLevel): string => {
    switch (strength) {
      case "weak":
        return "text-red-600 bg-red-50 border-red-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "strong":
        return "text-green-600 bg-green-50 border-green-200";
    }
  };

  const getProgressColor = (strength: PasswordStrengthLevel): string => {
    switch (strength) {
      case "weak":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "strong":
        return "bg-green-500";
    }
  };

  const getProgressWidth = (strength: PasswordStrengthLevel): string => {
    switch (strength) {
      case "weak":
        return "w-1/3";
      case "medium":
        return "w-2/3";
      case "strong":
        return "w-full";
    }
  };

  const getStrengthIcon = (strength: PasswordStrengthLevel) => {
    switch (strength) {
      case "weak":
        return <X className="h-4 w-4" />;
      case "medium":
        return <AlertTriangle className="h-4 w-4" />;
      case "strong":
        return <Check className="h-4 w-4" />;
    }
  };

  if (!password) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Strength Indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Password Strength
          </span>
          <div
            className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${getStrengthColor(analysis.strength)}`}
          >
            {getStrengthIcon(analysis.strength)}
            <span className="capitalize">{analysis.strength}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getProgressColor(analysis.strength)} ${getProgressWidth(analysis.strength)}`}
          />
        </div>
      </div>

      {/* Requirements List */}
      {showRequirements && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-gray-700">
            Requirements
          </span>
          <div className="space-y-1">
            {analysis.checks.map((check, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-full ${
                    check.passed
                      ? "bg-green-100 text-green-600"
                      : check.required
                        ? "bg-red-100 text-red-600"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {check.passed ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </div>
                <span
                  className={`${
                    check.passed
                      ? "text-green-700"
                      : check.required
                        ? "text-red-700"
                        : "text-gray-500"
                  } ${!check.required ? "text-xs" : ""}`}
                >
                  {check.label}
                  {!check.required && (
                    <span className="ml-1 text-gray-400">(optional)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips for improvement */}
      {analysis.strength !== "strong" && (
        <div className="rounded-md bg-blue-50 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-blue-600" />
            <div className="text-sm text-blue-800">
              <p className="mb-1 font-medium">Tips for a stronger password:</p>
              <ul className="list-inside list-disc space-y-1 text-xs">
                {!analysis.checks.find((c) => c.label.includes("12 characters"))
                  ?.passed && (
                  <li>Use at least 12 characters for better security</li>
                )}
                {!analysis.checks.find((c) =>
                  c.label.includes("special character"),
                )?.passed && <li>Add special characters like !@#$%^&*</li>}
                {!analysis.checks.find((c) =>
                  c.label.includes("No common patterns"),
                )?.passed && (
                  <li>
                    Avoid common patterns like 123, abc, or dictionary words
                  </li>
                )}
                <li>Consider using a passphrase with multiple words</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordStrength;
