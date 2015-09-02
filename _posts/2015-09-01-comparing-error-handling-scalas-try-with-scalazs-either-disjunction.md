---
layout: post
title: "Error Handling: Comparing Scala's Try with Scalaz's Either/Disjunction"
description: "Comparing Scalaz's Either/Disjunction with Scala's Try"
category: Scala
tags: [scala]
---
{% include JB/setup %}

Today we're going to compare two ways of handling errors in Scala. First we will look at the type `\/` from the `Scalaz` library (yes, this is its "name"). This type is usually called `Either` or `Disjunction`. Next we will look at the `Try` type from the Scala standard library. We go through the same example of implementing one function with both types. This will show their respective strengths and weaknesses.

A quick side note: You might ask yourself why i have not included the `Either` type from the Scala standard library as well. It is a pity that both Scalaz and Scala have a type with this name as this causes a lot of confusion. Let me assure you that those should not be really compared as they have different use cases.

### The example scenario

We are going to look at a small imaginary CMS application, that deals with users and their homepages. What we will try to do is authenticating a User and afterwards fetch his home page. Our domain model looks like this:

{% highlight scala %}
case class Homepage(title: String, content: String)
case class User(id: Long)

object DefaultHomePage extends Homepage("Welcome!", "This is your amazing Homepage!")
{% endhighlight %} 

As you can see it is really simple, but it will be enough to explore different ways of error handling. Sometimes things go wrong in this application, because other required applications are not available. So we'll need a `DefaultHomePage` to display when we have trouble loading the page the user has requested.

The following are the functions/methods that are provided to us:

{% highlight scala %}
trait EitherService {
  def authenticate(userId: String, secret: String): \/[MyError, User]
  def fetchHomePage(user: User): \/[MyError, Homepage]
}
trait TryService {
  def authenticate(userId: String, secret: String): Try[User]
  def fetchHomePage(user: User): Try[Homepage]
}
{% endhighlight %} 

As you can see someone was so kind to provide us with two different implementations. So we can explore both ways of handling errors. Our task is to write a function `homePageForUser` for each version of the Service that accepts a userId and a secret and returns a `Homepage` instance, which represents the home page of the user. The signatures of the new methods look like this:

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

def homePageForUser(userId: String, secret: String): \/[MyError, Homepage] = ???
{% endhighlight %} 

Let's briefly talk about the return type of `EitherService`. The return type indicates that we are getting either an error of type `MyError` or the successful result in the form of a `User` or a `Homepage`. Accordingly our new function will also return either a `MyError` instance or the `Homepage` if it succeeded. The error side is a strong part of the Scalaz Either. It is clearly showing what kind of errors we should expect. We can simply lookup its declaration:

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

It's always a good idea to declare your errors as a `sealed` type. This means you can extend this type only in the same source file. So at compile time all possible errors are known to you as a client. As we can see we might get back an error if a `User` does not exist for a given id or the provided secret was wrong. And we might even get back a `ServiceUnavailable` Error if `EitherService` is not available at the moment (database or other required application is down). These are all the error cases we should think about and what to do when they occur.


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

If you have not dealt with Scalaz before the following code may look very strange to you. The `\/` is the "name" of the type. This type has two possible subtypes: `-\/` (called left) and `\/-` (called right). Just look at the position of the `-` and you will know whether it is right or left. By convention the left subtype is reserved for errors. With `\/.left` and `\/.right` we can create instances of this type.<br/>

We extend our implementation to analyze the result of the for comprehension before returning something. We pattern match the result to check wether it's a left instance containing an `ServiceUnavailable` error. If so we provide the `DefaultHomePage` as a fallback. All other cases are returned unchanged (successful results and other errors).


{% highlight scala %}
def homePageForUser(userId: String, secret: String): \/[MyError, Page] = {
    val homepage: \/[MyError, Page] = for {
      user     <- service.authenticate(userId, secret)
      homePage <- service.fetchHomePage(user)
    } yield homePage

    homepage match {
      case -\/(error: ServiceUnavailable) =>
        \/.right(DefaultHomePage)
      case _ =>
        homepage
    }
  }
{% endhighlight %} 

As you can see the type `MyError` showed us clearly what could go wrong and we just had to go through those cases and decide what to do in each case.

### The version based on Scala's standard Try

Now we are going to implement the same thing again based on the `TryService`. Let's quickly recall its signature:

{% highlight scala %}
trait TryService {
  def authenticate(userId: String, secret: String): Try[User]
  def fetchHomePage(user: User): Try[Homepage]
}
{% endhighlight %} 

We will start out with the happy path again:

{% highlight scala %}
def homePageForUser(userId: String, secret: String): Try[Homepage] = {
    for {
      user     <- service.authenticate(userId, secret)
      homePage <- service.fetchHomePage(user)
    } yield homePage
}
{% endhighlight %} 

This version looks very similar to the one based on `Either`. Only the return types differ. This is because both types are monads and we use a for comprehension in both cases. Now let's add the Error handling again. In this version we can't tell from the type what errors we might encounter. With `Try` we are relying on `Exception`s for error handling. We dig through the source code and find the following exception hierarchy:

{% highlight scala %}
sealed class MyException(msg: String) extends Exception(msg, null)
case class UnknownUserException(userId: Long) extends MyException(s"User with id [$userId] is unknown.")
case class WrongSecretException(userId: Long) extends MyException(s"User with id [$userId] provided the wrong secret.")
case class ServiceUnavailableException(service: String) extends MyException(s"The Service [$service] is currently unavailable")
{% endhighlight %} 

The good thing is the implementing developer was so kind to also use the `sealed` keyword in this case. As we can see this hierarchy of exceptions is basically the same as the `Either` based version. This time we handle the case of unavailable services by handling the `ServiceUnavailableException`:

{% highlight scala %}
def homePageForUser(userId: String, secret: String): Try[Homepage] = {
  val homepage: Try[Homepage] = for {
    user     <- service.authenticate(userId, secret)
    homePage <- service.fetchHomePage(user)
  } yield homePage
  
  homepage match {
    case Failure(e: ServiceUnavailableException) =>
      DefaultHomePage
    case _ => 
      homepage
  }
}
{% endhighlight %} 

As with the previous version we pattern match on the result of the for comprehension. We go through the same cases. Just the name of the subtype for errors changes to `Failure`. In the case of the `ServiceUnavailableException` we return the fallback. <br/>
With `Try` we could actually write it in a shorter way by replacing the pattern matching with the very convenient `recover` method. We provide a `PartialFunction` to this method, which matches on the `Exception` and provides a fallback value. This fallback is only used if the `Try` represents a `Failure` and if the case matches.

{% highlight scala %}
homePageForUser.recover {
  case e: ServiceUnavailableException => DefaultHomePage
}
{% endhighlight %} 

So far this does look like as if the `Try` is not as good as the `Either`. It is <u>not</u> communicating the Errors we should think about. It justs offers the handy `recover` method, which makes our code shorter. But we have to be more precise before coming to a conclusion. We need to differentiate between **expected errors** and **unexpected errors**. The `Either` type is good at communicating expected errors. But we as programmers often deal with unexpected errors. Code is rarely perfect and therefore we should be prepared to deal with them. Let's examine how those both types perform when dealing with unexpected errors. In this case the `Try` will show its strengths.

### Dealing with unexpected errors

The attentive reader might have spotted a small weird thing in the example code. The model `User` does have an attribute id of type `Long`. But our methods `authenticate` and `homePageForUser` actually declare the parameter userId as a `String`. Does the method perform a conversion of the `String` into a `Long`? Let's try what happens when we try both variants in a REPL. We start with the `Either` version first:

{% highlight scala %}
// import our Either based example code
scala> homePageForUser("123", "my-secret!")
res0: scalaz.\/[try_vs_either.EitherExample.MyError,try_vs_either.Homepage] = \/-(Homepage(Your Homepage,Welcome to your Homepage!))

scala> homePageForUser("abc", "my-secret!")
java.lang.NumberFormatException: For input string: "abc"
  at java.lang.NumberFormatException.forInputString(NumberFormatException.java:65)
  at java.lang.Long.parseLong(Long.java:589)
{% endhighlight %}

As we can see the first one works, because everything is as expected. In the second case we suddenly run into an unexpected error and the call terminates with an exception. I know that this error may seem totally dumb and obvious to you, but it could be any other error you or someone else did not anticipate. Here we suddenly loose all goodness about error handling. Unexpected errors are suddenly not properly containerized anymore. This violates the holy grail of functional programming: **referential transparency**. The presumably more functional version based on `Scalaz` is not so functional anymore in this case!

Not let's try the same with the version based on `Try`:

{% highlight scala %}
// import our Try based example code
scala> homePageForUser("123", "my-secret!")
res0: scala.util.Try[try_vs_either.Homepage] = Success(Homepage(Your Homepage,Welcome to your Homepage!))

scala> homePageForUser("abc", "my-secret!")
res1: scala.util.Try[try_vs_either.Homepage] = Failure(java.lang.NumberFormatException: For input string: "abc")
{% endhighlight %}

Here we see that this does not happen to `Try`! The unexpected Error is still containerized. We get back a failure containing the unexpected exception. The value of this property cannot be underestimated on the JVM platform where exceptions are so widespread. Even if you are able to anticipate all possible errors and handle them in a proper way, you will still rely on other APIs that still rely on exceptions. In asynchronous applications this becomes even more important because unexpected errors can easily go undetected without proper containerization.

### Conclusion

I often found myself in discussions where some FP advocate claimed that Scalaz's `Either` is better than Standard Scalas `Either` (do not compare it to this one) and also better than the `Try` type. Yes, the Scalaz `Either` is better when you speak about **expected errors**. When you talk about **unexpected errors** the `Try` is the winner. I hope this will be helpful to you the next time you think about error handling.<br/>

But the question is: Can we have a type that is both good at clearly communicating expected errors and also at dealing with unexpected ones? I think there actually is and in one of my upcoming posts i would like to show you how to implement your own enhanced `Try` type, which combines the best of both worlds.

**I would love to hear your feedback. If you like, follow me on Twitter.**

PS: You can find the source code [here](https://github.com/mavilein/blog-try-vs-either).
