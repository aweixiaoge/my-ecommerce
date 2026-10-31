"use client";

import { useState } from "react";
import {
  CHECKOUT_CITY_MAX,
  CHECKOUT_LINE_MAX,
  CHECKOUT_NAME_MAX,
  CHECKOUT_PHONE_MAX,
  CHECKOUT_POSTAL_MAX,
} from "@my-ecommerce/shared";
import type { RegionLabel } from "@/lib/checkout/countries";
import type { Messages } from "@/lib/i18n/messages";
import { SelectField, TextField } from "./fields";

/*
 * The address block, shared by the checkout and the account's address book
 * (`components/account/address-form.tsx`), so an address is typed the same
 * way wherever it is typed. The words are the checkout's catalog slice in
 * both places.
 */

export type AddressField =
  | "countryCode"
  | "firstName"
  | "lastName"
  | "line1"
  | "line2"
  | "city"
  | "region"
  | "postalCode"
  | "phone";

export type AddressState = Record<AddressField, string>;

export interface CheckoutCountry {
  code: string;
  name: string;
  /** The province or state list, when the country has one. */
  regions: { label: RegionLabel; names: readonly string[] } | null;
}

/** An empty address in the given country, as both forms start one. */
export function blankAddress(countryCode: string): AddressState {
  return {
    countryCode,
    firstName: "",
    lastName: "",
    line1: "",
    line2: "",
    city: "",
    region: "",
    postalCode: "",
    phone: "",
  };
}

/**
 * One address: the design's country, names, address, the apartment line
 * behind its "+", city and province, postal code and phone.
 *
 * The province box is a menu for the countries that have a list and a free,
 * optional box elsewhere; changing country clears it, since a Chinese province
 * is not a Canadian one.
 */
export function AddressFields({
  prefix,
  value,
  onChange,
  countries,
  errors,
  messages,
}: {
  prefix: "shipping" | "billing";
  value: AddressState;
  onChange: (next: AddressState) => void;
  countries: CheckoutCountry[];
  errors: Record<string, string>;
  messages: Messages["checkout"];
}) {
  const [showLine2, setShowLine2] = useState(false);
  const set = (field: AddressField) => (next: string) =>
    onChange({ ...value, [field]: next, ...(field === "countryCode" ? { region: "" } : {}) });
  const name = (field: AddressField) => `${prefix}.${field}`;
  const auto = (token: string) => `${prefix} ${token}`;
  const regions = countries.find((country) => country.code === value.countryCode)?.regions ?? null;

  return (
    <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
      <SelectField
        name={name("countryCode")}
        label={messages.country}
        value={value.countryCode}
        onChange={set("countryCode")}
        autoComplete={auto("country")}
        error={errors[name("countryCode")]}
        className="sm:col-span-2"
      >
        {countries.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </SelectField>

      <TextField
        name={name("firstName")}
        label={messages.firstName}
        value={value.firstName}
        onChange={set("firstName")}
        autoComplete={auto("given-name")}
        required
        maxLength={CHECKOUT_NAME_MAX}
        error={errors[name("firstName")]}
      />
      <TextField
        name={name("lastName")}
        label={messages.lastName}
        value={value.lastName}
        onChange={set("lastName")}
        autoComplete={auto("family-name")}
        required
        maxLength={CHECKOUT_NAME_MAX}
        error={errors[name("lastName")]}
      />

      <TextField
        name={name("line1")}
        label={messages.address}
        value={value.line1}
        onChange={set("line1")}
        autoComplete={auto("address-line1")}
        required
        maxLength={CHECKOUT_LINE_MAX}
        error={errors[name("line1")]}
        className="sm:col-span-2"
      />

      {showLine2 || value.line2 !== "" ? (
        <TextField
          name={name("line2")}
          label={messages.line2}
          value={value.line2}
          onChange={set("line2")}
          autoComplete={auto("address-line2")}
          maxLength={CHECKOUT_LINE_MAX}
          error={errors[name("line2")]}
          className="sm:col-span-2"
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowLine2(true)}
          className="w-fit text-left text-[12px] leading-5 font-medium tracking-[0.14em] text-ink uppercase underline decoration-gold underline-offset-4 hover:decoration-ink sm:col-span-2"
        >
          {messages.addLine2}
        </button>
      )}

      <TextField
        name={name("city")}
        label={messages.city}
        value={value.city}
        onChange={set("city")}
        autoComplete={auto("address-level2")}
        required
        maxLength={CHECKOUT_CITY_MAX}
        error={errors[name("city")]}
      />
      {regions ? (
        <SelectField
          name={name("region")}
          label={messages[regions.label]}
          value={value.region}
          onChange={set("region")}
          autoComplete={auto("address-level1")}
          required
          error={errors[name("region")]}
        >
          <option value="">
            {regions.label === "state" ? messages.selectState : messages.selectProvince}
          </option>
          {regions.names.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </SelectField>
      ) : (
        <TextField
          name={name("region")}
          label={messages.region}
          value={value.region}
          onChange={set("region")}
          autoComplete={auto("address-level1")}
          maxLength={CHECKOUT_CITY_MAX}
          error={errors[name("region")]}
        />
      )}

      <TextField
        name={name("postalCode")}
        label={messages.postalCode}
        value={value.postalCode}
        onChange={set("postalCode")}
        autoComplete={auto("postal-code")}
        required
        maxLength={CHECKOUT_POSTAL_MAX}
        error={errors[name("postalCode")]}
      />
      <TextField
        name={name("phone")}
        type="tel"
        label={messages.phone}
        value={value.phone}
        onChange={set("phone")}
        autoComplete={auto("tel")}
        maxLength={CHECKOUT_PHONE_MAX}
        error={errors[name("phone")]}
      />
    </div>
  );
}

