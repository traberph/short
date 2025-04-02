# Short

This tool is intended to provide simple URL shortening and link aggregation functionality.
Users should be able to create shortened links for example to generate smaller QR codes with the built-in QR code generator.

The admin panel is a PWA for easy access and management of the links even on mobile devices.

It is powered by nextjs and postgres.  
Authentication is handled via OAuth2.

# Configuration

To configure short environment variables are used.  
Modify the `.env.template` to your needs.  
Postgres and Auth variables are mandatory for short to work.

### logo.dev integration
Logo.dev can be used to automatically fetch logos for the urls on the aggregation pages.  
To use Logo.dev an Token is required which can be requested via their webpage for free.  
If Logo.dev is enabled the attribution is automatically added to the footer.  
If `LOGO_DEV_TOKEN`is not set the first letter of the hostname is used as improvised logo.

### traberph/short attribution
As default in the footer is an attribution link to this GitHub repo.  
This can be disabled using the `DISABLE_ATTRIBUTION=true`.  


# Example Page
- optimized for mobile view
- simple and clean design

![example page](.assets/screenshot_home.png)

# Easy to use Admin Interface

## Overview Page

- get an overview of all links and their views

![admin landing page](.assets/admin01.png)

## Redirect Pages

- a simple redirect to a target url

![custom pages](.assets/admin03.png)

# Custom Pages

- an aggregation of multiple redirect pages
- (future work - text blocks; image blocks)

![redirect pages](.assets/admin02.png)


