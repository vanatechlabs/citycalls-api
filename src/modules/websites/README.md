# Website backend modules

Website CMS code is grouped first by website, then by page, and finally by page section.
This keeps similarly named sections from City Calls, HelpNow, and Beauty & Salon isolated.

```text
websites/
|-- city-calls/
|   `-- home-page/
|       `-- hero-carousel/
|-- help-now/
|   `-- home-page/
`-- beauty-and-salon/
    `-- home-page/
```

Add each future section inside its owning page, for example
`city-calls/home-page/popular-services/` or `help-now/home-page/hero-carousel/`.
