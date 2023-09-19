import axios from "axios";
import { downloadZip } from "client-zip";
import Head from "next/head";
import { env } from "~/env.mjs";
import { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { SubmitHandler, useForm } from "react-hook-form";
import { ToastContainer, toast } from "react-toastify";
import { z } from "zod";
import { Button } from "~/components/button";
import { Select, SelectItem } from "~/components/select";
import { gtfsFeeds, countries } from "~/config";
import { MetaImage } from "~/components/meta";

const gtfsToGeojsonFormId = "gtfs-to-geojson-form";
export const checkValidator =
  z.object({
    email: z
      .string()
      .min(5, { message: "Email is required" })
      .email("Must be a valid email"),
    name: z.string().min(3),
    country: z.string().transform((data) => z.object({ name: z.string(), id: z.string() }).parse(JSON.parse(data))),
    region: z.string().transform((data) => z.object({ name: z.string(), id: z.string() }).parse(JSON.parse(data))),
    updateSignup: z.enum(["on"]).optional(),
    verified: z.enum(["true"]),
    url: z.string().url(),
  });
type CheckValidatorType = z.infer<typeof checkValidator>;

export default function GTFSToGeoJson() {
  const { handleSubmit, formState: { errors }, register, setValue, getValues } = useForm();

  const [verified, setVerified] = useState(false);
  const [_agencies, setAgencies] = useState<typeof gtfsFeeds | null>(null);
  const [regions, setRegions] = useState<{ id: string; name: string; }[] | null>(null);
  const [agency, setAgency] = useState<SelectItem | null>(null);

  const onSubmit: SubmitHandler<CheckValidatorType> = async (data) => {
    try {

      const addContact = await axios.post("https://hook.us1.make.com/3rd3kck1q73jx0pq5ddu2nrygkrnx63a", {
        email: data.email,
        name: data.name,
        agency: agency?.name,
        city: agency?.city,
        state: agency?.state
      })

      const convertGTFS = await (await fetch('api/gtfs-to-geojson', { method: 'POST', body: JSON.stringify({ url: data.url }) })).json()
      if (addContact.status === 200 && convertGTFS) {
        const stops = { name: "stops.json", lastModified: new Date(), input: JSON.stringify(convertGTFS.stopsGeojson) }
        const routes = { name: "routes.json", lastModified: new Date(), input: JSON.stringify(convertGTFS.routesGeojson) }
        const trips = { name: "trips.json", lastModified: new Date(), input: JSON.stringify(convertGTFS.tripsGeojson) }
        const blob = await downloadZip([stops, routes, trips]).blob()

        // make and click a temporary link to download the Blob
        const link = document.createElement("a")
        link.href = URL.createObjectURL(blob)
        link.download = "gtfs-geojson.zip"
        link.click()
        link.remove()
        toast.success("Thanks for signing up!")
      }
      else toast.error("Something went wrong")
    } catch (e) {
      console.error(e)
      toast.error("Something went wrong")

    }
  }

  const onCountryChange = (e: SelectItem) => {
    if (!e.id) {
      return
    } else {
      setValue("country", e)
      const feeds = gtfsFeeds.filter((feed) => feed.country === e.id)
      setAgencies(feeds)
      setValue("region", null)
      const _regions = feeds.reduce((acc: { id: string; name: string; }[], feed) => {
        if (!acc.find((region) => region.id === feed.region)) {
          acc.push({ id: feed.region, name: feed.region })
        }
        return acc
      }, [])
      setRegions(_regions.sort((a, b) => a.name.localeCompare(b.name)))
    }
  }

  const onRegionChange = (e: SelectItem) => {
    if (!e.id || !_agencies) {
      return
    } else {
      setValue("region", e)
      const country = getValues('country')
      const _agencies = gtfsFeeds.filter((agency) => agency.region === e.id && agency.country === country.id)
      setAgencies(_agencies)
      setValue("agency", null)
    }
  }

  const onAgencyChange = (e: SelectItem) => {
    if (!e.name) {
      return
    } else {
      setAgency(e)
      setValue('url', e.url)
    }
  }
  return (
    <div>
      <Head>
        <title>GTFS to GeoJSON Conversion</title>
        <meta name="description"
          content="TransitChat is a platform that makes it easier for transit 
                    agencies to communicate with their riders and improve 
                    their services by organizing issues in one place."
        />
        <MetaImage />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
      </Head>
      <div className="mx-auto h-full w-full max-w-[1000px] relative pb-20 gap-10 grid md:flex md:flex-row-reverse md:items-start">
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={true}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          pauseOnHover
          theme="light"
        />
        <div className="grid w-full md:w-1/3 max-w-[500px] mx-auto md:mt-10 gap-10">
          <h2 className="text-center text-4xl block text-tcOrange drop-shadow-md bold">
            Convert your GTFS files to GeoJSON
          </h2>
          <iframe width="560" height="315" src="https://www.youtube.com/embed/U4MgpC9tn4o?si=bPKPCuM9oykApYOU" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"></iframe>
        </div>
        <form
          id={gtfsToGeojsonFormId}
          className="max-w-xl grid w-full sm:w-3/5 lg:w-1/2 inset-0 bg-gray-200 rounded-lg p-10 m-auto text-gray-700"
          // @ts-expect-error idk what is going on 
          onSubmit={handleSubmit(onSubmit)} // eslint-disable-line
        >
          <div className="w-full  gap-5 grid">
            <label className="pb-2" htmlFor={'name'}>
              Name
              <input
                {...register('name')}
                type='string'
                name='name'
                className="h-6 py-6 px-4 w-full border rounded-md"
              />
            </label>
            {errors.name?.message && typeof errors.name?.message === "string" && <p className="text-red-500 px-3">{errors.name?.message}</p>}
            {/* <ValidatedInput type="email" name="email" label="Email" error={errors.email?.message} /> */}
            <label className="pb-2" htmlFor={'email'}>
              Email
              <input
                {...register('email')}
                type='email'
                name='email'
                className="h-6 py-6 px-4 w-full border rounded-md"
              />
            </label>
            {errors.email?.message && typeof errors.email?.message === "string" && <p className="text-red-500 px-3">{errors.email?.message}</p>}
            <input hidden {...register('country')} value={agency ? agency?.country : undefined} />
            <Select
              options={countries}
              name="country"
              error={undefined}
              label='Country'
              onChange={onCountryChange}
            />
            <input hidden {...register('region')} value={agency ? agency?.region : undefined} />
            <Select
              options={regions || []}
              name="region"
              error={undefined}
              disabled={!regions || regions?.length === 0}
              label='Region'
              onChange={onRegionChange}
            />
            <input hidden {...register('agency')} value={agency ? agency?.url : undefined} />
            <Select
              options={_agencies || []}
              name='agency'
              error={undefined}
              disabled={!_agencies || _agencies?.length === 0}
              onChange={onAgencyChange}
              label='Agency' />
            <input {...register('verified')} value={verified.toString()} type="hidden" />
            <div className="flex mx-auto items-center gap-3">
              <input
                type="checkbox"
                name="updateSignup"
                defaultChecked
                className="h-6 w-6 border rounded-md"
              ></input>
              <label htmlFor="updateSignup">
                Would you like to get updates?
              </label>
            </div>
            <ReCAPTCHA
              className="m-auto child:m-auto child:w-full"
              sitekey={env.NEXT_PUBLIC_RECAPTCHA}
              onChange={(e) => setVerified(e ? true : false)}
            />
            <Button disabled={!verified ? true : false} type="submit">
              Submit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
