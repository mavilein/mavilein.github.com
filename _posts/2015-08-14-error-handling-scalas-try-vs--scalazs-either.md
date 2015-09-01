---
layout: post
title: "Error Handling: Scala's Try vs  Scalaz's Either/Disjunction"
description: ""
category: Scala
tags: [scala]
---
{% include JB/setup %}

Today we're going to compare two ways of handling errors in Scala. First we will look at the type `\/` from the `Scalaz` library (yes, this is its "name"). This type is usually called `Either` or `Disjunction`. Next we will look at the `Try` type from the Scala standard library. We go through the same example with both types to show their respective strengths and weaknesses.

A quick side note: You might ask yourself why i have not included the `Either` type from the Scala standard library as well. It is a pity that both Scalaz and Scala have a type with this name as this causes a lot of confusion in my opinion. Let me assure you that those should not be really compared as they are useful for pretty much different things.

### The example scenario

We are going to look a small imaginary CMS application, that deals with users and their homepages. Our "domain model" looks like this:

{% highlight scala %}
case class Homepage(title: String, content: String)
case class User(id: Long)

object DefaultHomePage extends Homepage("Welcome!", "This is your amazing Homepage!")
{% endhighlight %} 

As you can see it is really simple, but it will be enough to explore different ways of error handling. The `DefaultHomePage` will be used when things go wrong. What we will try to is authenticating a User and afterwards fetch his home page. The following are the functions/methods that are provided to us:

{% highlight scala %}
trait EitherService {
  def authenticate(userId: String, secret: String): \/[MyError, User]
  def fetchHomePage(user: User): \/[MyError, Page]
}
trait TryService {
  def authenticate(userId: String, secret: String): Try[User]
  def fetchHomePage(user: User): Try[Page]
}
{% endhighlight %} 

As you can see someone was so nice to provide us with two different implementations. So we can explore both ways of handling errors. Our task is to write a function `homePageForUser` for each version of the Service that that accepts a userId and a secret and returns a `Homepage` instance, which represents the home page of the user. The signatures of the new methods look like this:

{% highlight scala %}
// the function that uses the EitherService
def homePageForUser(userId: String, secret: String): \/[MyError, Homepage] = ???
// the function that uses the TryService
def homePageForUser(userId: String, secret: String): Try[Homepage] = ???
{% endhighlight %} 

The existing functions are a really great foundation, we just need to build upon them.


### The version based on Scalaz's Either, Disjunction or \/

We are supposed to implement this function, while we have access to the variable service of type `EitherService`.

{% highlight scala %}
val service: EitherService = ??? // let's not worry about its exact implementation

def homePageForUser(userId: String, secret: String): Try[Homepage] = ???
{% endhighlight %} 

Let's briefly talk about the return type of `EitherService`. The return type indicates that we are getting either an error of type `MyError` or the successful result in the form of a `User` or a `Homepage`. The error side is a strong part of the Scalaz Either. It is clearly showing what kind of errors we should expect. We can simply lookup its declaration:

{% highlight scala %}
sealed trait MyError
case class UnknownUser(userId: Long) extends MyError {
	override def toString = s"User with id [$userId] is unknown."
}
case class WrongSecret(userId: Long) extends MyError {
	override def toString = s"User with id [$userId] provided the wrong secret."
}
case class ServiceUnavailable(service: String) extends MyError {
	override def toString = s"The Service [$service] is currently unavailable"
}
{% endhighlight %} 

It's always a good idea to declare your errors as a `sealed` type. This means you can only extend this type in the same source file. So at compile time all possible errors are known to you as a client. As we can see we might get back an error if a `User` does not exist for a given id or the provided secret was wrong. And we might even get back a `ServiceUnavailable` Error if `EitherService` is not available at the moment (database or other application down). These are all the error cases we should think about and what to do when they occur.


But first let's start with an implementation of the happy path ignoring the errors for now. This looks like an easy task with a for comprehension. We simply call `authenticate` with the arguments we are given and afterwards go on to call `fetchHomePage` with the user we received as a result in the first step.

{% highlight scala %}
def homePageForUser(userId: String, secret: String): \/[MyError, Page] = {
    for {
      user     <- service.authenticate(userId, secret)
      homePage <- service.fetchHomePage(user)
    } yield homePage
}
{% endhighlight %} 

Now let's talk about error handling and the different errors that i have presented above. We can't do much when a user is unknown or his secret is not valid. Assume that we currently have a hard time with our infrastructure. Therefore different services are unfortunately down very often. So we are getting very often a `ServiceUnavailable` Error. Our method should handle this error case and just return the `DefaultHomePage` object. This default page provides basic functionality so our users can do at least something.
If you have not dealt with Scalaz before the code below may look very strange to you. The `\/` is the "name" of the type. This type has to possible subtypes: `-\/` (called left) and `\/-` (called right). Just look at the position of the `-` and you will know whether it is right or left. By convention the left subtype is reserved for errors.
We extend our implementation to analyze the result of the for comprehension before returning something. We pattern match the result to see wether it's a (successful) right result. If so we just return it. But if it is a left result and the contained error is `ServiceUnavailable` we return the `DefaultHomePage` as a successful right result instead. All other are returned unchanged.

{% highlight scala %}
// There's a convenient DefaultHomePage singleton object
object DefaultHomePage extends Page("Welcome!", "This is your amazing Homepage!")

def homePageForUser(userId: String, secret: String): \/[MyError, Page] = {
    val homepage: \/[MyError, Page] = for {
      user     <- service.authenticate(userId, secret)
      homePage <- service.fetchHomePage(user)
    } yield homePage

    homepage match {
      case \/-(_) =>
        homepage
      case -\/(_ : ServiceUnavailable) =>
        \/.right(DefaultHomePage)
      case error @ -\/(_) =>
        error
    }
  }
{% endhighlight %} 

As you can see the type `MyError` showed us clearly what could go wrong and we just had to go through those cases and decide what to do in each case.

### The version based on Scala's standard Try

Now we are going to implement the same thing again based on the Service with the `Try` type.

{% highlight scala %}
trait TryService {
  def authenticate(userId: String, secret: String): Try[User]
  def fetchHomePage(user: User): Try[Page]
}
{% endhighlight %} 

We will start out with the happy path again:

{% highlight scala %}
def homePageForUser(userId: String, secret: String): Try[Page] = {
    for {
      user     <- service.authenticate(userId, secret)
      homePage <- service.fetchHomePage(user)
    } yield homePage
}
{% endhighlight %} 

This version looks very similar to the one based on `Either`. This is because as both types are monads and the for comprehension do the heavy lifting for us. Now let's add the Error handling again. In this version we can't tell from the type what errors we might get. With `Try` we are relying on `Exception`s for error handling. We dig through the source code and find the following exception hierarchy:

{% highlight scala %}
sealed class MyException(msg: String) extends Exception(msg, null)
case class UnknownUserException(userId: Long) extends MyException(s"User with id [$userId] is unknown.")
case class WrongSecretException(userId: Long) extends MyException(s"User with id [$userId] provided the wrong secret.")
case class ServiceUnavailableException(service: String) extends MyException(s"The Service [$service] is currently unavailable")
{% endhighlight %} 

As we can see this hierarchy of exceptions is basically the same as the `Either` based version. Our code enhanced with the error handling for the `ServiceUnavailableException` is as follows:

{% highlight scala %}
def homePageForUser(userId: String, secret: String): Try[Page] = {
	val homePageForUser: Try[Page] = for {
	  user     <- service.authenticate(userId, secret)
	  homePage <- service.fetchHomePage(user)
	} yield homePage

	homePageForUser.recover {
	  case e: ServiceUnavailableException => DefaultHomePage
	}
}
{% endhighlight %} 

Here we do not use pattern matching as `Try` offers the very convenient `recover` method. We provide a `PartialFunction`, which matches on the `Exception` and provides a fallback value. Therefore we don't have to do the more cumbersome pattern matching as in the previous version.

So far this does look like as if the `Try` is not as good as the `Either`. It is not communicating the possible Errors. It justs offers the handy `recover` method, which makes our code shorter. But we have to be more precise. If we deal with **expected errors** the `Either` is indeed a better choice. But we as programmers often deal with **UNexpected errors**. My code is only rarely perfect and the same is most often true when dealing with code from others. In this case the `Try` will show its strengths. The attentive reader might have spotted a small weird thing in the example code. The model `User` does have an attribute id of type `Long`. But our methods `authenticate` and `homePageForUser` actually declare it as a `String`. Let's try what happens when we try both variants in a REPL? Let's try the either based version first:

{% highlight scala %}
// import our Either based example code
scala> homePageForUser("123", "my-secret!")
res0: scalaz.\/[try_vs_either.EitherExample.MyError,try_vs_either.Homepage] = \/-(Homepage(Your Homepage,Welcome to your Homepage!))
scala> homePageForUser("abc", "my-secret!")
java.lang.NumberFormatException: For input string: "abc"
  at java.lang.NumberFormatException.forInputString(NumberFormatException.java:65)
  at java.lang.Long.parseLong(Long.java:589)
{% endhighlight %}

As we can see the first one works, because everything is as expected. In the second case we suddenly run into an unexpected error and the call terminates with an exception. I know that this error may seem totally dumb and obvious to you, but it could be any other error you or someone else did not anticipate. Here we suddenly loose all goodness about error handling. Unexpected are suddenly not properly containerized anymore. This violates the holy grail of functional programming: **referential transparency**.

Not let's try the same with the version based on `Try`:

{% highlight scala %}
// import our Try based example code
scala> homePageForUser("123", "my-secret!")
res0: scala.util.Try[try_vs_either.Homepage] = Success(Homepage(Your Homepage,Welcome to your Homepage!))

scala> homePageForUser("abc", "my-secret!")
res1: scala.util.Try[try_vs_either.Homepage] = Failure(java.lang.NumberFormatException: For input string: "abc")
{% endhighlight %}

Here we see that this does not happen to `Try`! The unexpected Error is still containerized. And the value of this ability cannot be underestimated on the `JVM` platform where exceptions are the most common means to do error handling.

### Conclusion

I hope this was somewhat helpful to you. I often found myself in discussions where some FP advocate claimed that Scalaz's `Either` is much better than Standard Scalas `Either` (do not compare it to this one) and also much better as the `Try` type. Yes the Scalaz `Either` is better when you speak about **expected errors**. When you talk about unexpected errors the `Try` is the winner.
But the question is: Can we have a type that is both good at clearly communicating expected errors and also at dealing with unexpected ones. I think there actually is and in one of my upcoming posts i would like to show you how to implement your own `Try` type, which combines the best of both worlds.
